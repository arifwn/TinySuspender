class TinySuspenderContent {

  constructor() {
    this.debug = true;
    this.chrome = null;
  }

  log() {
    if (this.debug)
      console.log(...arguments);
  }

  setChrome(chrome) {
    this.chrome = chrome;
  }

  initEventHandlers() {
    this.chrome.runtime.onMessage.addListener(this.eventHandler.bind(this));
  }

  eventHandler(request, sender, sendResponse) {
    if (request.command && request.command.startsWith('ts_')) {
      let command = request.command.substr(3);
      if (this[command]) {
        this.log('calling', command, request, sender);
        return (this[command])(request, sender, sendResponse);
      }
    }

    this.log('unhandled event:', request, sender);
  }

  get_tab_state(request, sender, sendResponse) {
    if (document.querySelector('body').getAttribute('data-suspended') === 'true' ) {
      this.log({state: 'suspended:suspended'});
      sendResponse({state: 'suspended:suspended'});
    }
    else {
      this.log({state: 'suspendable:auto'});
      sendResponse({state: 'suspendable:auto'});
    }
  }
}


let tsc = new TinySuspenderContent();

if (this.chrome) {
  tsc.setChrome(chrome);
  tsc.initEventHandlers();
}


try {
  module.exports = ts;
}
catch (err) {

}
