class TinySuspenderContent {

  constructor() {
    this.debug = true;
    this.chrome = null;
    this.formUpdated = false;
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

    setTimeout(this.initFormListener.bind(this), 500);
    setInterval(this.initFormListener.bind(this), 60000);

    window.onfocus = this.initFormListener.bind(this);
  }

  initFormListener() {
    let inputs = document.querySelectorAll('input');
    for (let i = 0; i < inputs.length; i++) {
      let input = inputs[i];
      input.onchange = this.formDataChanged.bind(this);
    }

    let textareas = document.querySelectorAll('textarea');
    for (let i = 0; i < textareas.length; i++) {
      let input = textareas[i];
      input.onchange = this.formDataChanged.bind(this);
    }
  }

  eventHandler(request, sender, sendResponse) {
    if (request.command && request.command.startsWith('ts_')) {
      let command = request.command.substr(3);
      if (this[command]) {
        (this[command])(request, sender, sendResponse);
      }
    }
    else {
      this.log('unhandled event:', request, sender);
    }
  }

  formDataChanged() {
    this.formUpdated = true;
    this.chrome.runtime.sendMessage({command: "ts_update_tab_state", state: this.get_current_state()}, (response) => {
      
    });
  }

  get_current_state() {
    if (document.querySelector('body').getAttribute('data-suspended') === 'true' ) {
      return 'suspended:suspended';
    }
    else if (this.formUpdated) {
      return 'suspendable:form_changed';
    }
    
    return 'suspendable:auto';
  }

  get_tab_state(request, sender, sendResponse) {
    sendResponse({state: this.get_current_state()});
  }

  get_tab_scroll(request, sender, sendResponse) {
    let scrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };

    sendResponse({scroll: scrollPosition});
  }

  set_tab_scroll(request, sender, sendResponse) {
    let scroll = request.scroll;
    setTimeout(() => {
      window.scrollTo(scroll.x, scroll.y);
    }, 100);
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
