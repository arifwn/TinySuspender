
let initSettings = () => {
  chrome.storage.sync.get(['idleTimeMinutes', 'whitelist', 'autorestore'], (items) => {
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

  chrome.storage.sync.set({
    'idleTimeMinutes': idleTimeMinutes,
    'whitelist': whitelist,
    'autorestore': autorestore
  }, () => {
    document.querySelector('#message').textContent = 'Setting saved!';
  });
}


document.querySelector('#config').onsubmit = onSettingsSubmit;
initSettings();