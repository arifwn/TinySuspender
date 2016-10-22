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


  var isUrlMatch = function (pattern, url) {
    if (url.startsWith(pattern)) {
      return true;
    }

    return false;
  };


  var Suspender = TS.Suspender = class {
    constructor(url, title, whitelist) {
      this.url = url;
      this.title = title;

      if (!whitelist) {
        whitelist = [];
      }

      this.whitelist = whitelist;
      this._notSuspendableReason = null;
    }

    isSuspended() {
      if (isUrlMatch(chrome.extension.getURL('suspend.html'), this.url)) {
        return true;
      }

      return false;
    }

    isSuspendable() {
      this._notSuspendableReason = null;

      if (this.url.startsWith(chrome.extension.getURL('suspend.html'))) {
        this._notSuspendableReason = 'already_suspended';
        return false;
      }

      var systemPages = [
        '/^chrome-extension*/',
        '/^chrome*/',
        '/\/chrome\/newtab/'
      ];

      for (var i = 0; i < systemPages.length; i++) {
        var pattern = systemPages[i];
        if (this.isMatch(pattern, this.url)) {
          this._notSuspendableReason = 'system_page';
          return false;
        }
      }

      return true;
    }

    isMatch(pattern, string) {
      var isRegex = false;
      if ((pattern.length > 2) && (pattern.charAt(0) == '/') && (pattern.charAt(pattern.length-1) == '/')) {
        pattern = pattern.substr(1, pattern.length-2);
        isRegex = true;
      }

      if (!isRegex) {
        if (string.startsWith(pattern)) {
          return true;
        }
      }
      else {
        var re = new RegExp(pattern);
        if (re.exec(string)) {
          return true;
        }
      }

      return false;
    }

    isAutoSuspendable() {
      this._notSuspendableReason = null;

      var focusEl = document.activeElement;

      if (focusEl && (focusEl.tagName == 'INPUT' || focusEl.tagName == 'TEXTAREA')) {
        this._notSuspendableReason = 'receiving_input';
        return false;
      }

      for (var i = 0; i < this.whitelist.length; i++) {
        var pattern = this.whitelist[i];
        if (this.isMatch(pattern, this.url)) {
          this._notSuspendableReason = 'whitelisted';
          return false;
        }
      }

      return this.isSuspendable();
    }

    notSuspendableReason() {
      // null, 'receiving_input', 'system_page', 'whitelisted', 'already_suspended'
      // 'receiving_input': still suspendable, but not autosuspendable
      return this._notSuspendableReason;
    }

    suspend() {
      var suspendURL = chrome.extension.getURL('suspend.html') + '#uri=' + encodeURIComponent(this.url) + '&title=' + encodeURIComponent(this.title);
      window.location = suspendURL;
    }

    restore() {
      var params = getHashParams(this.url);
      if (params.uri) {
        window.location = params.uri;
      }
    }
  }

})(this);