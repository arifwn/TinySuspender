(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }
  
  var getHashParams = TS.getHashParams = function (url) {
    if (!url) {
      url = window.location.toString();
    }
    var hash = null;
    var s = url.split('#');
    if (s.length < 2) {
      return {};
    }
    hash = s[1];

    var hashParams = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = hash;

    while (e = r.exec(q))
       hashParams[d(e[1])] = d(e[2]);

    return hashParams;
  }

  var Suspender = TS.Suspender = class {
    constructor(url, title) {
      this.url = url;
      this.title = title;
    }

    isSuspended() {
      if (this.url.startsWith(chrome.extension.getURL('suspend.html'))) {
        return true;
      }

      return false;
    }

    isSuspendable() {
      if (this.url.startsWith('chrome-extension://')) {
        return false;
      }

      return true;
    }

    isAutoSuspendable() {
      return true;
    }

    notSuspendableReason() {
      // null, 'active_input', 'system_page'
      return null;
    }

    suspend() {
      var suspendURL = chrome.extension.getURL('suspend.html') + '#uri=' + encodeURIComponent(this.url) + '&title=' + encodeURIComponent(this.title);
      window.location = suspendURL;
    }

    restore() {
      var params = getHashParams(this.url);
      if (params.uri) {
        chrome.history.deleteUrl({url: window.location.toString() });
        window.location = params.uri;
      }
    }
  }

})(this);