'use strict';


class TinySuspenderCore {

  constructor() {
    this.debug = true;
    this.log('start');
    this.chrome = null;
    this.tabState = {};
  }

  log() {
    if (this.debug)
      console.log(...arguments);
  }

  setChrome(chrome) {
    this.chrome = chrome;
    this.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      ts.eventHandler(request, sender, sendResponse);
    });
    this.chrome.runtime.onSuspend.addListener(() => {
      this.saveState();
    });
    this.loadState();
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
      var tabIds = {};
      tabs.forEach(function (tab) {
        tabIds[tab.id] = tab.id;
      });

      for (var key in this.tabState) {
        if (this.tabState.hasOwnProperty(key)) {
          if (!tabIds[key]) {
            delete this.tabState[key];
          }
        }
      }
    });
  }

  setIconState(state, tabId) {
    var icon = 'icon-default-38.png'
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

    var param = {
      path: 'img/browser-icons/' + icon
    }

    if (tabId) {
      param.tabId = tabId;
    }

    this.chrome.browserAction.setIcon(param);
  }

  // event handlers:

  suspend_tab(request, sender, sendResponse) {
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
    this.chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  restore_current_tab(request, sender, sendResponse) {
    this.chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
    });
  }

  suspend_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  suspend_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.active) return;
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
    });
  }

  restore_all_tabs(request, sender, sendResponse) {
    this.chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        this.chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
    });
  }

  get_tab_state(request, sender, sendResponse) {
    if (request.tabId) {
      // check tab url; if system page, return nonsuspenable:system_page

      // ask content script for current state
      this.chrome.tabs.sendMessage(request.tabId, {command: 'ts_get_tab_state'}, (response) => {
        if (response.state == 'suspended:suspended') {
          sendResponse({state: 'suspended:suspended'});
        }
        else if (response.state == 'suspendable:auto') {
          // check this.tabState and whitelist to determine final state
          sendResponse({state: 'suspendable:auto'});
        }
        else {
          sendResponse({state: 'nonsuspenable:error'});
        }
      });

      // if content script did not answer within 2 seconds, return state as nonsuspenable:not_running
    }
  }

  eventHandler(request, sender, sendResponse) {
    if (request.command && request.command.startsWith('ts_')) {
      var command = request.command.substr(3);
      if (this[command]) {
        this.log('calling', command, request, sender);
        return (this[command])(request, sender, sendResponse);
      }
    }

    this.log('unhandled event:', request, sender);
  }

}

var ts = new TinySuspenderCore();

if (this.chrome) {
  ts.setChrome(chrome);
}


if (this.module && module.exports) {
  module.exports = ts;
}
