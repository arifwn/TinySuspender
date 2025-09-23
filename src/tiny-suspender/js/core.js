class TinySuspenderCore {

  constructor() {
    this.debug = true;
    this.log('start');
    this.chrome = null;

    // tabState is used to store per-tab status overrides,
    // e.g. don't suspend this tab for one hour, don't suspend for now, etc
    this.tabState = {};
    this.tabScrolls = {};
    this.excludedDomains = {};

    this.idleTimeMinutes = 30;
    this.whitelist = [];
    this.autorestore = false;
    this.skipAudible = false;
    this.skipPinned= false;
    this.skipWhenOffline = false;
    this.enableTabDiscard = false;

    this.darkMode = false;
  }

  log() {
    if (this.debug)
      console.log(...arguments);
  }

  saveState() {
    this.chrome.storage.local.set({'tabState': this.tabState, 'excludedDomains': this.excludedDomains}, () => {
      this.log('state saved');
    });
  }

  loadState() {
    this.chrome.storage.local.get(['tabState', 'excludedDomains'], (items) => {
      var tabState = items.tabState;
      if (!tabState) {
        this.tabState = {};
      }
      else {
        this.tabState = tabState;
      }

      var excludedDomains = items.excludedDomains;
      if (!excludedDomains) {
        this.excludedDomains = {};
      }
      else {
        this.excludedDomains = excludedDomains;
      }

      this.trimState();
      this.log('state loaded', this.tabState, this.excludedDomains);
    });
  }

  trimState() {
    this.chrome.tabs.query({}, (tabs) => {
      let tabIds = {};
      tabs.forEach((tab) => {
        tabIds[tab.id] = tab.id;
      });

      for (let key in this.tabState) {
        if (this.tabState.hasOwnProperty(key)) {
          if (!tabIds[key]) {
            this.log('trimming', key);
            delete this.tabState[key];
          }
        }
      }
    });
    this.saveState();
  }

  setChrome(chrome) {
    this.chrome = chrome;
    this.chrome.runtime.onMessage.addListener(this.eventHandler.bind(this));
    
    this.loadState();
    this.chrome.runtime.onSuspend.addListener(this.saveState.bind(this));

    this.chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
    this.chrome.tabs.onActivated.addListener(this.onTabActivated.bind(this));
    this.chrome.runtime.onInstalled.addListener(this.onPluginInstalled.bind(this));
    this.chrome.contextMenus.onClicked.addListener(this.onContextMenuClickHandler.bind(this));
    this.chrome.commands.onCommand.addListener(this.onCommand.bind(this));

    this.readSettings();
    this.chrome.storage.onChanged.addListener((changes, namespace) => {
      this.readSettings();
      this.resetAutoSuspensionTimers();
    });
    this.chrome.alarms.onAlarm.addListener(this.onAlarm.bind(this));
    this.initTimersForBackgroundTabs();
  }

  readSettings() {
    let promise = new Promise((resolve, reject) => {
      this.chrome.storage.sync.get([
        'idleTimeMinutes',
        'autorestore',
        'whitelist',
        'skip_audible',
        'skip_pinned',
        'skip_when_offline',
        'enable_tab_discard',
        'dark_mode'], (items) => {
        this.autorestore = items.autorestore;
        this.skipAudible = items.skip_audible;
        this.skipPinned = items.skip_pinned;
        this.skipWhenOffline = items.skip_when_offline;
        this.enableTabDiscard = items.enable_tab_discard;
        this.darkMode = items.dark_mode;

        this.idleTimeMinutes = parseInt(items.idleTimeMinutes);
        if (isNaN(this.idleTimeMinutes)) {
          this.idleTimeMinutes = 30;
        }

        this.whitelist = [];
        if (items.whitelist) {
          let list = items.whitelist.split("\n");

          for (let i = 0; i < list.length; i++) {
            let line = list[i];
            line = line.trim();
            if (line) {
              this.whitelist.push(line);
            }
          }
        }

        resolve({
          idleTimeMinutes: this.idleTimeMinutes,
          whitelist: this.whitelist,
          autorestore: this.autorestore,
          skipAudible: this.skip_audible,
          skipPinned: this.skip_pinned,
          skipWhenOffline: this.skipWhenOffline,
          enableTabDiscard: this.enableTabDiscard,
          darkMode: this.darkMode
        });
      });
    });

    return promise;
  }

  isSystemPage(tab) {
    if (!tab) return true;
    
    return !tab.url || 
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:') ||
      tab.url === '' ||
      tab.title === 'New tab' ||
      tab.title === 'Extensions' ||
      tab.title === 'New Tab';
  }

  isMatch(pattern, string) {
    let isRegex = false;
    if ((pattern.length > 2) && (pattern.charAt(0) == '/') && (pattern.charAt(pattern.length-1) == '/')) {
      pattern = pattern.substr(1, pattern.length-2);
      isRegex = true;
    }

    if (!isRegex) {
      if (string.startsWith(pattern)) {
        return true;
      }
    }
    else {
      let re = new RegExp(pattern);
      if (re.exec(string)) {
        return true;
      }
    }

    return false;
  }

  setIconState(state, tabId) {
    const stateToIcon = {
      normal: 'icon-default-38.png',
      green: 'icon-green-38.png',
      yellow: 'icon-yellow-38.png',
      red: 'icon-red-38.png',
      gray: 'icon-gray-38.png',
    };

    // Use the default icon if the state is not found in the mapping
    const icon = stateToIcon[state] || 'icon-default-38.png';

    let param = {
      path: `chrome-extension://${this.chrome.runtime.id}/img/browser-icons/${icon}`
    }

    if (tabId) {
      param.tabId = tabId;
    }
  
    this.chrome.action.setIcon(param);
  }

  setIconFromStateString(state, tabId) {
    const stateToIconMap = {
      'suspended:suspended': 'normal',
      'suspendable:auto': 'green',
      'suspendable:form_changed': 'yellow',
      'suspendable:audible': 'yellow',
      'suspendable:pinned': 'yellow',
      'suspendable:tab_whitelist': 'yellow',
      'suspendable:url_whitelist': 'yellow',
      'suspendable:domain_whitelist': 'yellow',
      'nonsuspendible:temporary_disabled': 'yellow',
      'nonsuspendible:system_page': 'gray',
      'nonsuspendible:not_running': 'red',
      'nonsuspendible:error': 'red'
    };
  
    const iconState = stateToIconMap[state] || 'red'; // Default to 'red' for unknown states
  
    this.setIconState(iconState, tabId);
  }

  getTabState(tabId) {
    let promise = new Promise((resolve, reject) => {
      this.chrome.tabs.get(tabId, (tab) => {
        if (!tab) {
          reject(new Error('Tab with id: ' + tabId + ' is not found!'));
          return;
        }

        try {
          // Validate URL before creating URL object
          if (!tab.url || typeof tab.url !== 'string' || tab.url.trim() === '') {
            resolve({state: 'nonsuspendible:system_page'});
            return;
          }

          let url = new URL(tab.url);

          if (url && url.protocol === 'chrome-extension:' && url.pathname === '/suspend.html') {
            resolve({state: 'suspended:suspended'});
            return;
          }

          if (tab.discarded) {
            resolve({state: 'nonsuspendible:discarded'});
            return;
          }

          if (url && url.protocol === 'chrome-extension:') {
            resolve({state: 'nonsuspendible:system_page'});
            return;
          }

          if (url && url.protocol === 'chrome:') {
            resolve({state: 'nonsuspendible:system_page'});
            return;
          }

          if (this.excludedDomains[url.hostname]) {
            resolve({state: 'suspendable:domain_whitelist'});
            return;
          }
        } catch (error) {
          console.log(error);
          resolve({state: 'nonsuspendible:system_page'});
          return;
        }

        let answered = false;

        // Check if this is a system page that won't have content scripts
        if (this.isSystemPage(tab)) {
          // Skip content script communication for system pages
          let state = 'nonsuspendible:system_page';
          answered = true;
          resolve({state: state});
          return;
        }

        // if content script did not answer within 2 seconds, return state as 'suspendable:auto'
        let timer = setTimeout(() => {
          if (!answered) {
            resolve({state: 'suspendable:auto'});
          }
        }, 2000);

        // ask content script for current state
        // Content script may prevent autosuspension if the user has unsaved form data
        const getTabState = (tabId, tab, resolve) => {
          this.chrome.tabs.sendMessage(tabId, {command: 'ts_get_tab_state'}, (response) => {
            console.log('>> ts_get_tab_state', response);
            if (chrome.runtime.lastError) {
              // console.log('chrome.runtime.lastError', tab.title, chrome.runtime.lastError)
            }
            
            let state = 'suspendable:auto';
            if (this.idleTimeMinutes == 0) {
              state = 'suspendable:auto_disabled';
            }

            if (response && response.state) {
              state = response.state;
            }

            if (state === 'suspendable:auto' && this.skipAudible && tab.audible) {
              state = 'suspendable:audible';
            }

            if (state === 'suspendable:auto' && this.skipPinned && tab.pinned) {
              state = 'suspendable:pinned';
            }

            if (state === 'suspendable:auto' && this.skipWhenOffline && (!navigator.onLine)) {
              state = 'suspendable:offline';
            }

            // ignore form changes when native tab discard in enabled.
            // native tab discard should be able to persist form data

            if (this.enableTabDiscard && (state == 'suspendable:form_changed')) {
              state = 'suspendable:auto';
            }

            // check this.tabState and whitelist to determine final state
            let storedState = this.tabState[tabId];

            if (storedState && (state != 'suspendable:form_changed')) {
              state = storedState.state;
            }

            // check whitelist

            if (this.whitelist.some(pattern => this.isMatch(pattern, tab.url))) {
              state = 'suspendable:url_whitelist';
            }


            answered = true;
            clearTimeout(timer);
            resolve({state: state});
          });
        }
        getTabState(tabId, tab, resolve);

      });

    });
    return promise;
  }

  getTabScroll(tabId) {
    return new Promise((resolve, reject) => {
      // First check if this tab exists and get its info
      this.chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          resolve({ x: 0, y: 0 });
          return;
        }

        // Check if this is a system page that won't have content scripts
        if (this.isSystemPage(tab)) {
          // Skip content script communication for system pages
          resolve({ x: 0, y: 0 });
          return;
        }

        // Set a timeout for 500 milliseconds
        let timer = setTimeout(() => {
          // If the content script hasn't answered within the timeout, resolve the promise
          resolve({ x: 0, y: 0 });
        }, 500);
    
        // Ask content script for current scroll position
        this.chrome.tabs.sendMessage(tabId, { command: 'ts_get_tab_scroll' }, {}, (response) => {
          clearTimeout(timer);
          
          if (chrome.runtime.lastError) {
            resolve({ x: 0, y: 0 });
          } else {
            resolve(response?.scroll || { x: 0, y: 0 });
          }
        });
      });
    });
  } 

  isSuspendable(state) {
    if (state && state.split) {
      let suspendable = state.split(':')[0];
      if (suspendable === 'suspendable') return true;
    }
    return false;
  }

  isAutoSuspendable(state) {
    if (state) {
      if (state === 'suspendable:auto') return true;
    }
    return false;
  }

  cancelTabAutosuspensionTimer(tabId) {
    this.log('canceling suspension timer for ', tabId)
    let alarmName = `${tabId}`;
    this.chrome.alarms.clear(alarmName);
  }

  createTabAutosuspensionTimer(tabId) {
    this.log('creating suspension timer for ', tabId)
    let alarmName = `${tabId}`;
    this.chrome.alarms.create(alarmName, {delayInMinutes: this.idleTimeMinutes})
  }

  initTimersForBackgroundTabs() {
    this.log('initTimersForBackgroundTabs')
    this.readSettings()
      .then((settings) => {
        if (settings.idleTimeMinutes == 0) return;
        this.chrome.tabs.query({ active: false }, (tabs) => {
          tabs.forEach((tab) => {
            let tabId = tab.id;
            let alarmName = `${tabId}`;
            this.getTabState(tabId)
              .then((state) => {
                if (this.isAutoSuspendable(state.state)) {
                  this.chrome.alarms.get(alarmName, (alarm) => {
                    if (alarm) return;
                    this.createTabAutosuspensionTimer(tab.id);
                  });
                }
              })
              .catch((error) => {});
          });
        });
      })
      .catch((error) => {});
  }

  resetAutoSuspensionTimers() {
    this.chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        this.cancelTabAutosuspensionTimer(tab.id);
      });
      this.initTimersForBackgroundTabs();
    });
  }

  suspendTab(tabId) {
    let tabState;
    this.getTabState(tabId)
      .then((state) => {
        tabState = state;
        return this.getTabScroll(tabId);
      })
      .then((scroll) => {
        let state = tabState;
        if (this.isSuspendable(state.state)) {
          this.chrome.tabs.get(tabId, (tab) => {
            if (this.enableTabDiscard) {
              chrome.tabs.discard(tab.id);
            }
            else if (tab.discarded) {
              // do nothing
              this.log('this tab is already suspended via native tab discard: ', tab.id);
            }
            else {
              this.chrome.tabs.update(tab.id, {
                url: 'suspend.html?url=' + encodeURIComponent(tab.url)
                   + '&title=' + encodeURIComponent(tab.title)
                   + '&favIconUrl=' + encodeURIComponent(tab.favIconUrl)
                   + '&scroll_x=' + encodeURIComponent(scroll.x)
                   + '&scroll_y=' + encodeURIComponent(scroll.y)
                   + '&dark_mode=' + encodeURIComponent(this.darkMode)
              });
            }
          });
        }
      })
      .catch((error) => {

      });
  }

  restoreTab(tabId) {
    this.chrome.tabs.get(tabId, (tab) => {
      let url = new URL(tab.url);
      if (url && url.protocol === 'chrome-extension:' && url.pathname === '/suspend.html') {
        this.tabScrolls[tabId] = {x: url.searchParams.get('scroll_x'), y: url.searchParams.get('scroll_y')};

        let pageUrl = url.searchParams.get('url');
        this.chrome.tabs.update(tab.id, {url: pageUrl});
      }
    });
  }

  autoSuspendTab(tabId) {
    let tabState;
    this.getTabState(tabId)
      .then((state) => {
        tabState = state;
        return this.getTabScroll(tabId);
      })
      .then((scroll) => {
        let state = tabState;
        if (this.isAutoSuspendable(state.state)) {
          this.chrome.tabs.get(tabId, (tab) => {
            if (this.enableTabDiscard) {
              chrome.tabs.discard(tab.id);
            }
            else if (tab.discarded) {
              // do nothing
              this.log('this tab is already suspended via native tab discard: ', tab.id);
            }
            else {
              this.chrome.tabs.update(tab.id, {
                url: 'suspend.html?url=' + encodeURIComponent(tab.url)
                   + '&title=' + encodeURIComponent(tab.title)
                   + '&favIconUrl=' + encodeURIComponent(tab.favIconUrl)
                   + '&scroll_x=' + encodeURIComponent(scroll.x)
                   + '&scroll_y=' + encodeURIComponent(scroll.y)
                   + '&dark_mode=' + encodeURIComponent(this.darkMode)
              });
            }
          });
        }
      })
      .catch((error) => {

      });
  }

  shouldAutorestore(tabId) {
    if (this.autorestore) {
      this.restoreTab(tabId);
    }
  }

  shouldTabScrollToPosition(tabId) {
    let scroll = this.tabScrolls[tabId];
    if (scroll) {
      return true;
    }
    return false;
  }

  scrollTabToPosition(tabId) {
    let scroll = this.tabScrolls[tabId];
    delete this.tabScrolls[tabId];
    this.sendScrollCommand(tabId, scroll);
  }

  sendScrollCommand(tabId, scroll) {
    this.chrome.tabs.sendMessage(tabId, {command: 'ts_set_tab_scroll', scroll: scroll});
  }

  // event handlers:

  onPluginInstalled() {
    this.chrome.contextMenus.removeAll(() => {
      // Create one test item for each context type.
      var contexts = [
        ["page", "Suspend Tab"],
        ["link", "Open link in new suspended tab"]];
      for (var i = 0; i < contexts.length; i++) {
        var context = contexts[i][0];
        var title = contexts[i][1];
        var id = this.chrome.contextMenus.create({
          "title": title,
          "contexts":[context],
          "id": "context-" + context
        });
      }
    });
  }

  onAlarm(alarm) {
    this.log('timer alarm fired:', alarm);
    let tabId = parseInt(alarm.name);
    if (isNaN(tabId)) return;

    this.autoSuspendTab(tabId);
  }

  onContextMenuClickHandler(info, tab) {
    console.log('context', info)
    if (info.menuItemId === 'context-link') {
      this.chrome.tabs.create({
        active: false,
        url: 'suspend.html?url=' + encodeURIComponent(info.linkUrl)
        + '&title=' + encodeURIComponent(info.linkUrl)
        + '&dark_mode=' + encodeURIComponent(this.darkMode)
      });
    }
    else {
      this.suspendTab(tab.id);
    }
  };

  onCommand(command) {
    if (command === 'suspend-active-tab') {
      this.chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.suspendTab(tabId);
        });
      });
    }
    if (command === 'suspend-all-tabs') {
      this.chrome.tabs.query({lastFocusedWindow: true}, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.autoSuspendTab(tabId);
        });
      });
    }
    if (command === 'suspend-all-tabs-all-windows') {
      this.chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.autoSuspendTab(tabId);
        });
      });
    }
    if (command === 'suspend-other-tabs') {
      this.chrome.tabs.query({ active: false, lastFocusedWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.autoSuspendTab(tabId);
        });
      });
    }
    if (command === 'restore-active-tab') {
      this.chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.restoreTab(tabId);
        });
      });
    }
    if (command === 'restore-other-tabs') {
      this.chrome.tabs.query({ active: false, lastFocusedWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.restoreTab(tabId);
        });
      });
    }
    if (command === 'restore-all-tabs') {
      this.chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.restoreTab(tabId);
        });
      });
    }
    if (command === 'restore-all-tabs-all-windows') {
      this.chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          let tabId = tab.id;
          this.restoreTab(tabId);
        });
      });
    }
  }

  onTabUpdated(tabId, changeInfo, tab) {
    this.getTabState(tabId)
      .then((state) => {
        this.setIconFromStateString(state.state, tabId);
      })
      .catch((error) => {

      });

    if (changeInfo.status === 'complete') {
      if (this.shouldTabScrollToPosition(tabId)) {
        this.scrollTabToPosition(tabId);
      }
    }
  }

  onTabActivated(activeInfo) {
    let tabId = activeInfo.tabId;
    this.getTabState(tabId)
      .then((state) => {
        this.setIconFromStateString(state.state, tabId);
        if (state.state === 'suspended:suspended') {
          this.shouldAutorestore(tabId);
        }
      })
      .catch((error) => {

      });

    // cancel timer
    this.cancelTabAutosuspensionTimer(activeInfo.tabId);
    this.initTimersForBackgroundTabs();
  }

  suspend_tab(request, sender, sendResponse) {
    this.log('suspend_tab');
    this.suspendTab(request.tabId);
  }

  auto_suspend_tab(request, sender, sendResponse) {
    this.log('suspend_tab');
    this.autoSuspendTab(request.tabId);
  }

  restore_tab(request, sender, sendResponse) {
    this.log('restore_tab');
    if (request.tabId) {
      this.restoreTab(request.tabId);
    }
  }

  get_tab_state(request, sender, sendResponse) {
    if (request.tabId) {
      this.getTabState(request.tabId)
      .then((state) => {
        sendResponse(state);
        this.setIconFromStateString(state.state, request.tabId);
      })
      .catch((error) => {

      });
      return true;
    }
  }

  update_tab_icon(request, sender, sendResponse) {
    if (sender.tab) {
      this.setIconFromStateString(request.state, sender.tab.id);
      sendResponse(request.state);
    }
  }

  tab_disable_auto_suspension(request, sender, sendResponse) {
    let state = {
      state: 'suspendable:tab_whitelist'
    }
    this.tabState[request.tabId] = state;
    this.saveState();
  }

  tab_enable_auto_suspension(request, sender, sendResponse) {
    if (this.tabState[request.tabId]) {
      delete this.tabState[request.tabId];
      this.saveState();
    }
  }

  disable_auto_suspension_domain(request, sender, sendResponse) {
    console.log('disable_auto_suspension_domain', request.domain)
    this.excludedDomains[request.domain] = true;
    this.saveState();
  }

  enable_auto_suspension_domain(request, sender, sendResponse) {
    console.log('enable_auto_suspension_domain', request.domain)
    if (this.excludedDomains[request.domain]) {
      delete this.excludedDomains[request.domain];
      this.saveState();
    }
  }

  eventHandler(request, sender, sendResponse) {
    if (request.command && request.command.startsWith('ts_')) {
      let command = request.command.substr(3);
      if (this[command]) {
        this.log('calling', command, request, sender);
        let commandFunc = this[command].bind(this);
        return commandFunc(request, sender, sendResponse);
      }
    }

    this.log('unhandled event:', request, sender);
  }

}


let ts = new TinySuspenderCore();

if (this.chrome) {
  ts.setChrome(chrome);
}


try {
  module.exports = ts;
}
catch (err) {

}
