class TinySuspenderCore {

  constructor() {
    this.debug = true;
    this.log('start');
    this.chrome = null;

    // tabState is used to store per-tab status overrides,
    // e.g. don't suspend this tab for one hour, don't suspend for now, etc
    this.tabState = {};

  }

  log() {
    if (this.debug)
      console.log(...arguments);
  }

  saveState() {
    this.chrome.storage.sync.set({'tabState': this.tabState}, () => {
      this.log('state saved');
    });
  }

  loadState() {
    this.chrome.storage.sync.get(['tabState'], (items) => {
      var tabState = items.tabState;
      if (!tabState) {
        this.tabState = {};
      }
      else {
        this.tabState = tabState;
      }

      this.trimState();
      this.log('state loaded', this.tabState);
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
            delete this.tabState[key];
          }
        }
      }
    });
  }

  setChrome(chrome) {
    this.chrome = chrome;
    this.chrome.runtime.onMessage.addListener(this.eventHandler.bind(this));
    this.loadState();
    this.chrome.runtime.onSuspend.addListener(this.saveState.bind(this));

    this.chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
    this.chrome.tabs.onActivated.addListener(this.onTabActivated.bind(this));
  }

  setIconState(state, tabId) {
    let icon = 'icon-default-38.png'
    if (state == 'normal') {
      icon = 'icon-default-38.png'
    }
    else if (state == 'green') {
      icon = 'icon-green-38.png'
    }
    else if (state == 'yellow') {
      icon = 'icon-yellow-38.png'
    }
    else if (state == 'red') {
      icon = 'icon-red-38.png'
    }
    else if (state == 'gray') {
      icon = 'icon-gray-38.png'
    }
    else {
      icon = 'icon-default-38.png'
    }

    let param = {
      path: `img/browser-icons/${icon}`
    }

    if (tabId) {
      param.tabId = tabId;
    }

    this.chrome.browserAction.setIcon(param);
  }

  setIconFromStateString(state, tabId) {
    if (state === 'suspended:suspended') {
      this.setIconState('normal', tabId);
    }
    else if (state === 'suspendable:auto') {
      this.setIconState('green', tabId);
    }
    else if (state === 'suspendable:form_changed') {
      this.setIconState('yellow', tabId);
    }
    else if (state === 'suspendable:tab_whitelist') {
      this.setIconState('yellow', tabId);
    }
    else if (state === 'suspendable:tab_whitelist') {
      this.setIconState('yellow', tabId);
    }
    else if (state === 'nonsuspenable:temporary_disabled') {
      this.setIconState('yellow', tabId);
    }
    else if (state === 'nonsuspenable:system_page') {
      this.setIconState('gray', tabId);
    }
    else if (state === 'nonsuspenable:not_running') {
      this.setIconState('red', tabId);
    }
    else if (state === 'nonsuspenable:error') {
      this.setIconState('red', tabId);
    }
    else {
      this.setIconState('red', tabId);
    }
  }

  getTabState(tabId) {
    let promise = new Promise((resolve, reject) => {
      this.chrome.tabs.get(tabId, (tab) => {
        let url = new URL(tab.url);

        if (url && url.protocol === 'chrome-extension:' && url.pathname === '/suspend.html') {
          resolve({state: 'suspended:suspended'});
          return;
        }

        if (url && url.protocol === 'chrome-extension:') {
          resolve({state: 'nonsuspenable:system_page'});
          return;
        }

        if (url && url.protocol === 'chrome:') {
          resolve({state: 'nonsuspenable:system_page'});
          return;
        }

        let answered = false;

        // if content script did not answer within 2 seconds, return state as nonsuspenable:not_running
        let timer = setTimeout(() => {
          if (!answered) {
            resolve({state: 'nonsuspenable:not_running'});
          }
        }, 2000);

        // ask content script for current state
        // Content script may prevent autosuspension if the user has unsaved form data
        this.chrome.tabs.sendMessage(tabId, {command: 'ts_get_tab_state'}, (response) => {
          let state = 'suspendable:auto';

          if (response && response.state) {
            state = response.state;
          }

          // check this.tabState and whitelist to determine final state
          let storedState = this.tabState[tabId];

          if (storedState && (state != 'suspendable:form_changed')) {
            state = storedState.state;
          }

          // TODO: check whitelist

          answered = true;
          clearTimeout(timer);
          resolve({state: state});
        });

      });

    });
    return promise;
  }

  // event handlers:

  onTabUpdated(tabId, changeInfo, tab) {
    this.getTabState(tabId)
      .then((state) => {
        this.setIconFromStateString(state.state, tabId);
      })
      .catch((error) => {

      });
  }

  onTabActivated(activeInfo) {
    let tabId = activeInfo.tabId;
    this.getTabState(tabId)
      .then((state) => {
        this.setIconFromStateString(state.state, tabId);
      })
      .catch((error) => {

      });
  }

  suspend_tab(request, sender, sendResponse) {
    this.log('suspend_tab');
    if (request.tabId) {
      this.chrome.tabs.get(request.tabId, (tab) => {
        chrome.tabs.update(tab.id, {url: 'suspend.html?url=' + encodeURIComponent(tab.url) + '&title=' + encodeURIComponent(tab.title) + '&favIconUrl=' + encodeURIComponent(tab.favIconUrl)})
      });

    }
  }

  restore_tab(request, sender, sendResponse) {
    if (request.tabId) {
      this.chrome.tabs.sendMessage(request.tabId, {command: 'ts_restore_tab'});
    }
  }

  suspend_current_tab(request, sender, sendResponse) {
    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  restore_current_tab(request, sender, sendResponse) {
    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
    });
  }

  suspend_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  suspend_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.active) return;
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  restore_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
    });
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
