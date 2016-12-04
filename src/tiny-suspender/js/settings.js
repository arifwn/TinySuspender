
let initSettings = () => {
  chrome.storage.sync.get(['idleTimeMinutes', 'whitelist'], (items) => {
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
  });
}


let onSettingsSubmit = (e) => {
  e.preventDefault();

  let idleTimeMinutes = parseInt(document.querySelector('#config input[name=idle_time]').value);
  if (isNaN(idleTimeMinutes)) return;

  idleTimeMinutes = idleTimeMinutes;

  let whitelist = document.querySelector('#config textarea[name=whitelist]').value;
  if (!whitelist) whitelist = '';

  chrome.storage.sync.set({
    'idleTimeMinutes': idleTimeMinutes,
    'whitelist': whitelist
  }, () => {
    document.querySelector('#message').textContent = 'Setting saved!';
  });
}


document.querySelector('#config').onsubmit = onSettingsSubmit;
initSettings();