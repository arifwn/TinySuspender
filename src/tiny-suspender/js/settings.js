(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }

  var initSettingForm = function () {
    chrome.storage.sync.get(['idleTimeMinutes', 'whitelist'], function (items) {
      var idleTimeMinutes = items.idleTimeMinutes;
      if (!idleTimeMinutes) {
        idleTimeMinutes = 30;
      }
      document.querySelector('#config input[name=idle_time]').value = idleTimeMinutes;

      var whitelist = items.whitelist;
      if (!whitelist) {
        whitelist = '';
      }
      document.querySelector('#config textarea[name=whitelist]').value = whitelist;
    });
  };

  var saveSettingForm = function () {
    chrome.storage.sync.set({
        'idleTimeMinutes': document.querySelector('#config input[name=idle_time]').value,
        'whitelist': document.querySelector('#config textarea[name=whitelist]').value
    }, function () {
      document.querySelector('#message').textContent = 'Setting saved!';
    });
  };

  initSettingForm();


  document.querySelector('#config').onsubmit = function (e) {
    e.preventDefault();
    saveSettingForm();
  };

})(this);