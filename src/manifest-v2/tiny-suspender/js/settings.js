
let initSettings = () => {
  chrome.storage.sync.get([
    'idleTimeMinutes',
    'whitelist',
    'autorestore',
    'skip_audible',
    'skip_pinned',
    'skip_when_offline',
    'enable_tab_discard',
    'dark_mode'
  ], (items) => {
    let idleTimeMinutes = parseInt(items.idleTimeMinutes);
    if (isNaN(idleTimeMinutes)) {
      idleTimeMinutes = 30;
    }

    document.querySelector('#config input[name=idle_time]').value = idleTimeMinutes;

    let whitelist = items.whitelist;
    if (!whitelist) {
      whitelist = '';
    }
    document.querySelector('#config textarea[name=whitelist]').value = whitelist;

    if (items.autorestore) {
      document.querySelector('#config input[name=autorestore]').setAttribute('checked', 'checked');
    }
    else {
      document.querySelector('#config input[name=autorestore]').removeAttribute('checked');
    }

    if (items.skip_audible) {
      document.querySelector('#config input[name=skip_audible]').setAttribute('checked', 'checked');
    }
    else {
      document.querySelector('#config input[name=skip_audible]').removeAttribute('checked');
    }

    if (items.skip_pinned) {
      document.querySelector('#config input[name=skip_pinned]').setAttribute('checked', 'checked');
    }
    else {
      document.querySelector('#config input[name=skip_pinned]').removeAttribute('checked');
    }

    if (items.skip_when_offline) {
      document.querySelector('#config input[name=skip_when_offline]').setAttribute('checked', 'checked');
    }
    else {
      document.querySelector('#config input[name=skip_when_offline]').removeAttribute('checked');
    }

    if (items.enable_tab_discard) {
      document.querySelector('#config input[name=enable_tab_discard]').setAttribute('checked', 'checked');
    }
    else {
      document.querySelector('#config input[name=enable_tab_discard]').removeAttribute('checked');
    }

    if (items.dark_mode) {
      document.querySelector('#config input[name=dark_mode]').setAttribute('checked', 'checked');
      document.body.classList.add('dark-mode');
    }
    else {
      document.querySelector('#config input[name=dark_mode]').removeAttribute('checked');
      document.body.classList.remove('dark-mode');
    }


  });
}


let onSettingsSubmit = (e) => {
  e.preventDefault();

  let idleTimeMinutes = parseInt(document.querySelector('#config input[name=idle_time]').value);
  if (isNaN(idleTimeMinutes)) return;

  idleTimeMinutes = idleTimeMinutes;

  let whitelist = document.querySelector('#config textarea[name=whitelist]').value;
  if (!whitelist) whitelist = '';

  let autorestore = document.querySelector('#config input[name=autorestore]').checked;
  let skip_audible = document.querySelector('#config input[name=skip_audible]').checked;
  let skip_pinned = document.querySelector('#config input[name=skip_pinned]').checked;
  let skip_when_offline = document.querySelector('#config input[name=skip_when_offline]').checked;
  let enable_tab_discard = document.querySelector('#config input[name=enable_tab_discard]').checked;
  let dark_mode = document.querySelector('#config input[name=dark_mode]').checked;

  chrome.storage.sync.set({
    'idleTimeMinutes': idleTimeMinutes,
    'whitelist': whitelist,
    'autorestore': autorestore,
    'skip_audible': skip_audible,
    'skip_when_offline': skip_when_offline,
    'skip_pinned': skip_pinned,
    'enable_tab_discard': enable_tab_discard,
    'dark_mode': dark_mode
  }, () => {
    document.querySelector('#message').textContent = 'Setting saved!';
    document.querySelector('#message2').textContent = 'Setting saved!';

    // check if dark mode is enabled
    if (dark_mode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  });
}


document.querySelector('#config').onsubmit = onSettingsSubmit;


let onKeyboardShortcuts = (e) => {
  e.preventDefault();
  chrome.tabs.create({url: 'chrome://extensions/configureCommands'});
}

document.querySelector('.shortcuts').onclick = onKeyboardShortcuts;

document.querySelector('#version_string').textContent = 'v' + chrome.runtime.getManifest().version;

initSettings();