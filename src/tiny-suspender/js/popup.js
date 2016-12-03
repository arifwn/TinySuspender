class TinySuspenderPopup {
  constructor() {
    this.debug = true;
    this.chrome = null;
    this.state = null;
  }

  log() {
    if (this.debug)
      console.log(...arguments);
  }

  setChrome(chrome) {
    this.chrome = chrome;
  }

  initEventHandlers() {
    document.querySelector('.suspend-btn').onclick = this.onSuspend.bind(this);
    document.querySelector('.suspend-all-btn').onclick = this.onSuspendAll.bind(this);
    document.querySelector('.suspend-others-btn').onclick = this.onSuspendOthers.bind(this);
    document.querySelector('.restore-btn').onclick = this.onRestore.bind(this);
    document.querySelector('.restore-all-btn').onclick = this.onRestoreAll.bind(this);

    document.querySelector('.temporary-disable-auto-suspend-btn').onclick = this.onTemporaryDisableAutoSuspension.bind(this);
    document.querySelector('.enable-auto-suspend-btn').onclick = this.onEnableAutoSuspension.bind(this);
    document.querySelector('.disable-tab-auto-suspend-btn').onclick = this.onDisableAutoSuspensionThisTab.bind(this);
    document.querySelector('.enable-tab-auto-suspend-btn').onclick = this.onEnableAutoSuspensionThisTab.bind(this);

    document.querySelector('.add-to-whitelist-btn').onclick = this.onAddPageToWhitelist.bind(this);

    document.querySelector('.settings-btn').onclick = this.onSettings.bind(this);

    document.querySelector('#config').onsubmit = this.onQuickSettingsSubmit.bind(this);
    document.querySelector('#config input').onchange = this.onQuickSettingsChanged.bind(this);
  }

  getTabState() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.runtime.sendMessage({command: "ts_get_tab_state", tabId: tab.id}, (response) => {
          this.state = response.state;
          this.updateStatusTextFromState(response.state);
        });
      });
    });
  }

  updateStatusTextFromState(state) {
    let statusText = '';
    if (state === 'suspended:suspended') {
      statusText = 'This tab is currently suspended.';
    }
    else if (state === 'suspendable:auto') {
      statusText = 'This tab will be suspended automatically.';
    }
    else if (state === 'suspendable:form_changed') {
      statusText = 'This tab will not be suspended automatically since it contains unsaved form data.';
    }
    else if (state === 'suspendable:tab_whitelist') {
      statusText = 'This tab will not be suspended automatically for now.';
    }
    else if (state === 'suspendable:url_whitelist') {
      statusText = 'This url is whitelisted and will not be suspended automatically.';
    }
    else if (state === 'nonsuspenable:temporary_disabled') {
      statusText = 'This tab will not be suspended automatically for now.';
    }
    else if (state === 'nonsuspenable:system_page') {
      statusText = 'System page cannot be suspended.';
    }
    else if (state === 'nonsuspenable:not_running') {
      statusText = "Content script is not running. Reload the tab to make sure it's running.";
    }
    else if (state === 'nonsuspenable:error') {
      statusText = "Cannot suspend this page.";
    }
    else {
      statusText = "Unknown error occurs.";
    }
    document.querySelector('#status_text').textContent = statusText;
  }

  onSuspend(e) {
    this.log('onSuspend');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.runtime.sendMessage({command: "ts_suspend_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onSuspendAll(e) {
    this.log('onSuspendAll');
  }

  onSuspendOthers(e) {
    this.log('onSuspendOthers');
  }

  onRestore(e) {
    this.log('onRestore');
  }

  onRestoreAll(e) {
    this.log('onRestoreAll');
  }

  onTemporaryDisableAutoSuspension(e) {
    this.log('onTemporaryDisableAutoSuspension');
  }

  onEnableAutoSuspension(e) {
    this.log('onEnableAutoSuspension');
  }

  onDisableAutoSuspensionThisTab(e) {
    this.log('onDisableAutoSuspensionThisTab');
  }

  onEnableAutoSuspensionThisTab(e) {
    this.log('onEnableAutoSuspensionThisTab');
  }

  onAddPageToWhitelist(e) {
    this.log('onAddPageToWhitelist');
  }

  onSettings(e) {
    this.log('onSettings');
  }

  onQuickSettingsChanged(e) {
    this.log('onQuickSettingsChanged');
  }

  onQuickSettingsSubmit(e) {
    this.log('onQuickSettingsSubmit');
    e.preventDefault();
  }
}


let tsp = new TinySuspenderPopup();

if (this.chrome) {
  tsp.setChrome(chrome);
  tsp.initEventHandlers();
  setTimeout(() => {
    tsp.getTabState();
  }, 200);

}

try {
  module.exports = ts;
}
catch (err) {

}
