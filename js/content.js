(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }
  

  var suspendCommand = TS.suspendCommand = function () {
    console.log('suspend tab');
    var suspender = new TS.Suspender(window.location.toString(), document.title);

    if (suspender.isSuspendable()) {
      suspender.suspend();
    }
  };

  var restoreCommand = TS.restoreCommand = function () {
    console.log('restore tab');
    var suspender = new TS.Suspender(window.location.toString(), document.title);

    if (suspender.isSuspended()) {
      suspender.restore();
    }
  };


  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
      if (msg.command === 'ts_suspend_tab') {
        suspendCommand();
      }

      if (msg.command === 'ts_restore_tab') {
        restoreCommand();
      }
  });


  var timer = null;
  var idleTimeMinutes = 30;
  var idleTime = idleTimeMinutes * 60 * 1000;

  var startIdleTimer = function () {
    if (!document.hidden) {
      return;
    }

    chrome.storage.sync.get('idleTimeMinutes', function (items) {
      idleTimeMinutes = items.idleTimeMinutes;
      if (!idleTimeMinutes) {
        idleTimeMinutes = 30;
      }
      idleTime = idleTimeMinutes * 60 * 1000;

      timer = setTimeout(function () {
        suspendCommand();
      }, idleTime);
      console.log('Tab hidden. Will suspend in ' + (idleTime / 1000) + ' seconds');
    });
  };

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (!idleTime) {
        return;
      }
      startIdleTimer();
    }
    else {
      console.log('Tab shown. Cancelling suspend timer.');
      clearTimeout(timer);
    }
  });

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
      var storageChange = changes[key];
      if (key == 'idleTimeMinutes') {
        console.log('Setting changed. Resetting suspend timer.');
        clearTimeout(timer);
        startIdleTimer();
      }
    }
  });

})(this);