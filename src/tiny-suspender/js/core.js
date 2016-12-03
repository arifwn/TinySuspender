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

  // event handlers:

  suspend_tab(request, sender, sendResponse) {
    this.log('suspend_tab');
    if (request.tabId) {
      this.chrome.tabs.sendMessage(request.tabId, {command: 'ts_suspend_tab'});
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
      // check tab url; if system page, return nonsuspenable:system_page

      let answered = false;

      // if content script did not answer within 2 seconds, return state as nonsuspenable:not_running
      let timer = setTimeout(() => {
        if (!answered) {
          this.log('nonsuspenable:not_running');
          sendResponse({state: 'nonsuspenable:not_running'});
        }
      }, 2000);

      // ask content script for current state
      this.chrome.tabs.sendMessage(request.tabId, {command: 'ts_get_tab_state'}, (response) => {
        if (response && response.state == 'suspended:suspended') {
          answered = true;
          clearTimeout(timer);
          sendResponse({state: 'suspended:suspended'});
        }
        else if (response && response.state == 'suspendable:auto') {
          // check this.tabState and whitelist to determine final state
          let state = this.tabState[request.tabId];
          if (!state) {
            state = 'suspendable:auto';
          }

          // TODO: check whitelist

          answered = true;
          clearTimeout(timer);

          this.log('sending response', state);
          sendResponse({state: state});
        }
        else {
          this.log(response);
          answered = true;
          clearTimeout(timer);
          sendResponse({state: 'nonsuspenable:error'});
        }
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
