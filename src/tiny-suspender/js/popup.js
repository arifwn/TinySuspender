class TinySuspenderPopup {
  constructor() {
    this.debug = true;
    this.chrome = null;
    this.state = null;
    this.idleTimeMinutes = 30;
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

    document.querySelector('.disable-tab-auto-suspend-btn').onclick = this.onDisableAutoSuspensionThisTab.bind(this);
    document.querySelector('.enable-tab-auto-suspend-btn').onclick = this.onEnableAutoSuspensionThisTab.bind(this);

    document.querySelector('.add-to-whitelist-btn').onclick = this.onAddPageToWhitelist.bind(this);

    document.querySelector('.settings-btn').onclick = this.onSettings.bind(this);

    document.querySelector('#config').onsubmit = this.onQuickSettingsSubmit.bind(this);
    document.querySelector('#config input').onchange = this.onQuickSettingsChanged.bind(this);
  }

  initQuickSettings() {
    this.chrome.storage.sync.get(['idleTimeMinutes', 'enable_tab_discard'], (items) => {
      this.idleTimeMinutes = parseInt(items.idleTimeMinutes);
      if (isNaN(this.idleTimeMinutes)) {
        this.idleTimeMinutes = 30;
      }

      document.querySelector('#config input[name=idle_time]').value = this.idleTimeMinutes;

      this.enableTabDiscard = items.enable_tab_discard;
      if (this.enableTabDiscard) {
        let tabDiscardElement = document.createElement('span');
        let tabDiscardMessage = document.createTextNode('Native tab discard is enabled. Many features are not available in this mode.');
        tabDiscardElement.appendChild(tabDiscardMessage);
        tabDiscardElement.classList.add('bottom-status');
        tabDiscardElement.classList.add('red');
    
        document.querySelector('#bottom_status_container').appendChild(tabDiscardElement);
      }
    });
  }

  getTabState() {
    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_get_tab_state", tabId: tab.id}, (response) => {
          this.state = response.state;
          this.updateStatusFromState(response.state);
        });
      });
    });
  }

  updateStatusFromState(state) {

    let setColor = (color) => {
      let statusText = document.querySelector('#status_text');
      statusText.classList.remove('red');
      statusText.classList.remove('yellow');
      statusText.classList.remove('blue');
      if (color) {
        statusText.classList.add(color);
      }
    }

    let statusText = '';
    if (state === 'suspended:suspended') {
      statusText = 'This tab is currently suspended.';
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'none';
      document.querySelector('.suspend-others-btn').style.display = 'none';
      document.querySelector('.restore-btn').style.display = 'block';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'none';
      setColor();
    }
    else if (state === 'suspendable:auto') {
      statusText = `This tab will be suspended automatically after ${this.idleTimeMinutes} minutes in the background.`;
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'block';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('blue');
    }
    else if (state === 'suspendable:auto_disabled') {
      statusText = 'This tab will not be suspended automatically since automatic suspension is disabled.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:form_changed') {
      statusText = 'This tab will not be suspended automatically since it may contains unsaved form data.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:audible') {
      statusText = 'Audible tab will not be suspended automatically.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:pinned') {
      statusText = 'Pinned tab will not be suspended automatically.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:offline') {
      statusText = 'Network appears to be down. Tabs will not be suspended automatically.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:tab_whitelist') {
      statusText = 'This tab will not be suspended automatically for now.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'block';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'suspendable:url_whitelist') {
      statusText = 'This url is whitelisted and will not be suspended automatically.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'none';
      setColor('yellow');
    }
    else if (state === 'nonsuspenable:temporary_disabled') {
      statusText = 'This tab will not be suspended automatically for now.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'nonsuspenable:discarded') {
      statusText = 'This tab is currently suspended via native tab discard.';
      document.querySelector('.suspend-btn').style.display = 'block';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('yellow');
    }
    else if (state === 'nonsuspenable:system_page') {
      statusText = 'System page cannot be suspended.';
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'none';
      setColor('gray');
    }
    else if (state === 'nonsuspenable:not_running') {
      statusText = "Content script is not running. Reload the tab to make sure it's running.";
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('red');
    }
    else if (state === 'nonsuspenable:error') {
      statusText = "Cannot suspend this page.";
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('red');
    }
    else {
      statusText = "Unknown error occurs.";
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'block';
      document.querySelector('.disable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.enable-tab-auto-suspend-btn').style.display = 'none';
      document.querySelector('.add-to-whitelist-btn').style.display = 'block';
      setColor('red');
    }
    document.querySelector('#status_text').textContent = statusText;

    if (this.enableTabDiscard) {
      document.querySelector('.suspend-btn').style.display = 'none';
      document.querySelector('.suspend-all-btn').style.display = 'none';
      document.querySelector('.suspend-others-btn').style.display = 'block';
      document.querySelector('.suspend-others-btn').text = 'Suspend all background tabs';
      document.querySelector('.restore-btn').style.display = 'none';
      document.querySelector('.restore-all-btn').style.display = 'none';
    }
  }

  onSuspend(e) {
    this.log('onSuspend');

    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_suspend_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onSuspendAll(e) {
    this.log('onSuspendAll');

    this.chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_auto_suspend_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onSuspendOthers(e) {
    this.log('onSuspendOthers');

    this.chrome.tabs.query({ active: false, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_auto_suspend_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onRestore(e) {
    this.log('onRestore');

    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_restore_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onRestoreAll(e) {
    this.log('onRestoreAll');

    this.chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_restore_tab", tabId: tab.id});
      });
      window.close();
    });
  }

  onDisableAutoSuspensionThisTab(e) {
    this.log('onDisableAutoSuspensionThisTab');

    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_tab_disable_auto_suspension", tabId: tab.id});
      });
      window.close();
    });
  }

  onEnableAutoSuspensionThisTab(e) {
    this.log('onEnableAutoSuspensionThisTab');

    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_tab_enable_auto_suspension", tabId: tab.id});
      });
      window.close();
    });
  }

  onAddPageToWhitelist(e) {
    this.log('onAddPageToWhitelist');

    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        let url = new URL(tab.url);
        let pageUrl = `${url.origin}${url.pathname}`;

        this.chrome.storage.sync.get('whitelist', (items) => {
          let whitelist = items.whitelist;
          if (!whitelist) {
            whitelist = '';
          }

          whitelist = `${whitelist}\n${pageUrl}`;
          this.chrome.storage.sync.set({'whitelist': whitelist}, () => {
            window.close();
          });
        });
      });
    });
  }

  onSettings(e) {
    this.log('onSettings');
    window.open(chrome.extension.getURL('settings.html'));
    window.close();
  }

  onQuickSettingsChanged(e) {
    this.log('onQuickSettingsChanged');

    let idleTimeMinutes = parseInt(document.querySelector('#config input[name=idle_time]').value);
    if (isNaN(idleTimeMinutes)) return;

    this.idleTimeMinutes = idleTimeMinutes;

    this.chrome.storage.sync.set({'idleTimeMinutes': idleTimeMinutes}, () => {
      setTimeout(this.getTabState.bind(this), 500);
    });
  }

  onQuickSettingsSubmit(e) {
    this.log('onQuickSettingsSubmit');
    e.preventDefault();

    let idleTimeMinutes = parseInt(document.querySelector('#config input[name=idle_time]').value);
    if (isNaN(idleTimeMinutes)) return;

    this.idleTimeMinutes = idleTimeMinutes;

    this.chrome.storage.sync.set({'idleTimeMinutes': idleTimeMinutes}, () => {
      setTimeout(this.getTabState.bind(this), 500);
    });
  }
}


let tsp = new TinySuspenderPopup();

if (this.chrome) {
  tsp.setChrome(chrome);
  tsp.initEventHandlers();
  tsp.initQuickSettings();
  setTimeout(() => {
    tsp.getTabState();
  }, 200);

}

try {
  module.exports = ts;
}
catch (err) {

}
