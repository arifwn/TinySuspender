// Minimal chrome API mock for testing core.js. Each call to makeChromeMock()
// returns an isolated chrome surface plus hooks to fire events and inspect
// outgoing calls. The mock intentionally only covers the API surface core.js
// actually touches — extend as needed.

function makeListenerHub() {
  const listeners = [];
  return {
    addListener: (fn) => listeners.push(fn),
    fire: (...args) => listeners.forEach((fn) => fn(...args)),
  };
}

function pickKeys(obj, keys) {
  const out = {};
  (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
    if (k in obj) out[k] = obj[k];
  });
  return out;
}

function makeChromeMock(initial = {}) {
  const syncStorage = { ...(initial.sync || {}) };
  const localStorage = { ...(initial.local || {}) };
  const alarms = new Map();
  const tabs = new Map();

  const hubs = {
    onMessage: makeListenerHub(),
    onSuspend: makeListenerHub(),
    onInstalled: makeListenerHub(),
    onUpdated: makeListenerHub(),
    onActivated: makeListenerHub(),
    onRemoved: makeListenerHub(),
    onCreated: makeListenerHub(),
    onContextMenuClick: makeListenerHub(),
    onCommand: makeListenerHub(),
    onStorageChanged: makeListenerHub(),
    onAlarm: makeListenerHub(),
  };

  const calls = {
    alarmsCreate: [],
    alarmsClear: [],
    tabsUpdate: [],
    setIcon: [],
  };

  const chrome = {
    runtime: {
      id: 'test-extension-id',
      lastError: null,
      getURL: (p) => 'chrome-extension://test-extension-id/' + String(p).replace(/^\//, ''),
      onMessage:   { addListener: hubs.onMessage.addListener },
      onSuspend:   { addListener: hubs.onSuspend.addListener },
      onInstalled: { addListener: hubs.onInstalled.addListener },
    },
    tabs: {
      onUpdated:   { addListener: hubs.onUpdated.addListener },
      onActivated: { addListener: hubs.onActivated.addListener },
      onRemoved:   { addListener: hubs.onRemoved.addListener },
      onCreated:   { addListener: hubs.onCreated.addListener },
      query: (q, cb) => {
        const out = [...tabs.values()].filter((t) =>
          q.active === undefined || t.active === q.active
        );
        cb(out);
      },
      get: (id, cb) => cb(tabs.get(id)),
      update: (id, info, cb) => {
        calls.tabsUpdate.push({id, info});
        const t = tabs.get(id);
        if (t && info.url) t.url = info.url;
        if (cb) cb(t);
      },
      sendMessage: (id, msg, ...rest) => {
        const cb = rest.find((x) => typeof x === 'function');
        // Pretend no content script is listening; respond with undefined.
        if (cb) setImmediate(() => cb(undefined));
      },
      discard: () => {},
      create: (info, cb) => { if (cb) cb({}); },
    },
    storage: {
      sync: {
        get: (keys, cb) => setImmediate(() => cb(pickKeys(syncStorage, keys))),
        set: (items, cb) => { Object.assign(syncStorage, items); if (cb) cb(); },
      },
      local: {
        get: (keys, cb) => setImmediate(() => cb(pickKeys(localStorage, keys))),
        set: (items, cb) => { Object.assign(localStorage, items); if (cb) cb(); },
      },
      onChanged: { addListener: hubs.onStorageChanged.addListener },
    },
    alarms: {
      create: (name, opts) => {
        calls.alarmsCreate.push({name, opts});
        alarms.set(name, {
          name,
          scheduledTime: Date.now() + opts.delayInMinutes * 60000,
        });
      },
      clear: (name, cb) => {
        calls.alarmsClear.push(name);
        const had = alarms.delete(name);
        if (cb) cb(had);
      },
      get: (name, cb) => setImmediate(() => cb(alarms.get(name))),
      onAlarm: { addListener: hubs.onAlarm.addListener },
    },
    contextMenus: {
      onClicked: { addListener: hubs.onContextMenuClick.addListener },
      removeAll: (cb) => { if (cb) cb(); },
      create: (info) => info.id,
    },
    commands: {
      onCommand: { addListener: hubs.onCommand.addListener },
    },
    action: {
      setIcon: (param) => calls.setIcon.push(param),
    },
  };

  return {
    chrome,
    fire: {
      onCreated:        hubs.onCreated.fire,
      onActivated:      hubs.onActivated.fire,
      onRemoved:        hubs.onRemoved.fire,
      onUpdated:        hubs.onUpdated.fire,
      onStorageChanged: hubs.onStorageChanged.fire,
      onAlarm:          hubs.onAlarm.fire,
    },
    setTabs: (list) => {
      tabs.clear();
      list.forEach((t) => tabs.set(t.id, t));
    },
    syncStorage,
    localStorage,
    alarms,
    calls,
  };
}

module.exports = { makeChromeMock };
