(function (root) {
  'use strict';

  var TS = root.TS;
  if (!root.TS) {
    TS = root.TS = {};
  }

  // The onClicked callback function.
  function onClickHandler(info, tab) {
    chrome.tabs.sendMessage(tab.id, {command: 'ts_suspend_tab'});
  };

  chrome.contextMenus.onClicked.addListener(onClickHandler);

  // Set up context menu tree at install time.
  chrome.runtime.onInstalled.addListener(function() {
    // Create one test item for each context type.
    var contexts = ["all"];
    for (var i = 0; i < contexts.length; i++) {
      var context = contexts[i];
      var title = "Suspend Tab";
      var id = chrome.contextMenus.create({"title": title, "contexts":[context],
                                           "id": "context" + context});
    }
  });


})(this);