(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }

  var init = function () {
    chrome.history.deleteUrl({url: window.location.toString() });

    var params = null;
    if (window.location.hash) {
      params = TS.getHashParams();
    }

    if (params.uri) {
      document.querySelector('.title .description').setAttribute('href', params.uri);
      document.querySelector('.title .url').setAttribute('href', params.uri);
      document.querySelector('.title .url').textContent = params.uri;

      var icon = document.createElement('img');
      icon.setAttribute('src', 'chrome://favicon/' + params.uri);
      document.querySelector('.title .icon').appendChild(icon);

      var link = document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = 'chrome://favicon/' + params.uri;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    if (params.title) {
      document.title = params.title;
      document.querySelector('.title .description').textContent = params.title;
    }
  };

  init();

  var restoreCommad = function () {
    var suspender = new TS.Suspender(window.location.toString(), document.title);
    if (suspender.isSuspended()) {
      suspender.restore();
    }
  };

  document.onclick = function (e) {
    e.preventDefault();
    restoreCommad();
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

    if (msg.command === 'ts_restore_tab') {
      restoreCommad();
    }
  });

})(this);