(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }

  var whitelist = TS.whitelist = [];
  
  var _suspender = null;
  var getSuspender = TS.getSuspender = function () {
    if (!_suspender) {
      _suspender = new TS.Suspender(window.location.toString(), document.title, TS.whitelist);
    }
    return _suspender;
  }

  var getWhitelist = TS.getWhitelist = function () {
    chrome.storage.sync.get('whitelist', function (items) {
      root.items = items;
      if (items.whitelist) {
        var list = items.whitelist.split("\n");
        TS.whitelist.length = 0;

        for (var i = 0; i < list.length; i++) {
          var line = list[i];
          line = line.trim();
          if (line) {
            TS.whitelist.push(line);
          }
        }
      }
    });
  };

  getWhitelist();

  var suspendCommand = TS.suspendCommand = function () {
    // console.log('suspend tab');
    var suspender = getSuspender();

    if (suspender.isSuspendable()) {
      suspender.suspend();
    }
  };

  var autoSuspendCommand = TS.autoSuspendCommand = function () {
    // console.log('suspend tab');
    var suspender = getSuspender();

    if (suspender.isAutoSuspendable()) {
      suspender.suspend();
    }
  };

  var restoreCommand = TS.restoreCommand = function () {
    // console.log('restore tab');
    var suspender = getSuspender();

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

      if (msg.command === 'ts_status') {
        var suspender = getSuspender();
        var response = {
          isSuspendable: suspender.isSuspendable(),
          isAutoSuspendable: suspender.isAutoSuspendable(),
          notSuspendableReason: suspender.notSuspendableReason()
        };

        sendResponse(response);
      }
  });


  TS.timer = null;
  TS.idleTimeMinutes = 30;
  TS.idleTime = TS.idleTimeMinutes * 60 * 1000;

  var startIdleTimer = function () {
    if (!document.hidden) {
      return;
    }

    chrome.storage.sync.get('idleTimeMinutes', function (items) {
      TS.idleTimeMinutes = items.idleTimeMinutes;
      if (!TS.idleTimeMinutes) {
        TS.idleTimeMinutes = 30;
      }
      TS.idleTime = TS.idleTimeMinutes * 60 * 1000;

      TS.timer = setTimeout(function () {
        autoSuspendCommand();
      }, TS.idleTime);
      console.log('Tab hidden. Will suspend in ' + (TS.idleTime / 1000) + ' seconds');
    });
  };

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (!TS.idleTime) {
        return;
      }
      startIdleTimer();
    }
    else {
      console.log('Tab shown. Cancelling suspend timer.');
      clearTimeout(TS.timer);
      TS.timer = null;
    }
  });

  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
      var storageChange = changes[key];
      if (key == 'idleTimeMinutes') {
        console.log('Setting changed.');
        clearTimeout(TS.timer);
        TS.timer = null;
        if (document.hidden) {
          console.log('Resetting suspend timer.');
          startIdleTimer();
        }
      }
      if (key == 'whitelist') {
        getWhitelist();
      }
    }
  });

})(this);