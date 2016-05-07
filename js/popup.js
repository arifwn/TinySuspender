(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }


  var suspendCurrentTab = function (e) {
    e.preventDefault();

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
      window.close();
    });
  };

  var suspendAllTabs = function (e) {
    e.preventDefault();

    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
      });
      window.close();
    });
  };

  var suspendOtherTabs = function (e) {
    e.preventDefault();

    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        if (!tab.active) {
          chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
        }
      });
      window.close();
    });
  };

  var restoreCurrentTab = function (e) {
    e.preventDefault();

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
      window.close();
    });
  };

  var restoreAllTabs = function (e) {
    e.preventDefault();

    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      tabs.forEach(function (tab) {
        chrome.tabs.sendMessage(tab.id, {command: 'ts_restore_tab'});
      });
      window.close();
    });
  };

  document.querySelector('.suspend-btn').onclick = suspendCurrentTab;
  document.querySelector('.suspend-all-btn').onclick = suspendAllTabs;
  document.querySelector('.suspend-others-btn').onclick = suspendOtherTabs;

  document.querySelector('.restore-btn').onclick = restoreCurrentTab;
  document.querySelector('.restore-all-btn').onclick = restoreAllTabs;

  var initSettingForm = function () {
    chrome.storage.sync.get('idleTimeMinutes', function (items) {
      var idleTimeMinutes = items.idleTimeMinutes;
      if (!idleTimeMinutes) {
        idleTimeMinutes = 30;
      }

      document.querySelector('#config input[name=idle_time]').value = idleTimeMinutes;
    });
  };

  var saveSettingForm = function () {
    console.log('saving...');
    chrome.storage.sync.set({'idleTimeMinutes': document.querySelector('#config input[name=idle_time]').value}, function () {
      console.log('Settings saved');
    });
  };

  initSettingForm();


  document.querySelector('#config').onsubmit = function (e) {
    e.preventDefault();
    saveSettingForm();
  };

  document.querySelector('#config').onchange = function (e) {
    e.preventDefault();
    saveSettingForm();
  };


})(this);