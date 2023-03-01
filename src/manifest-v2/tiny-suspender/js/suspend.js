
let suspendUrl = new URL(location.href);
let pageUrl = suspendUrl.searchParams.get('url');
let favIconUrl = suspendUrl.searchParams.get('favIconUrl');
let title = suspendUrl.searchParams.get('title');
let darkMode = suspendUrl.searchParams.get('dark_mode') === 'true';

// compatibility with previous version
// will be removed in the next version
if (!pageUrl) {
  let suspendUrl = new URL(location.href);
  let hash = suspendUrl.hash ? suspendUrl.hash.replace('#', '') : '';

  let hashParams = {};
  let e,
      a = /\+/g,  // Regex for replacing addition symbol with a space
      r = /([^&;=]+)=?([^&;]*)/g,
      d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
      q = hash;

  while (e = r.exec(q))
     hashParams[d(e[1])] = d(e[2]);

  pageUrl = hashParams.uri;
  title = hashParams.title;
}
// end compatibility section


document.onclick = () => {
    this.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        this.chrome.runtime.sendMessage({command: "ts_restore_tab", tabId: tab.id});
      });
    });
}


if (pageUrl) {
  document.querySelector('.title .description').setAttribute('href', pageUrl);
  document.querySelector('.title .url').setAttribute('href', pageUrl);
  document.querySelector('.title .url').textContent = pageUrl;
}


if (favIconUrl) {
  var icon = document.createElement('img');
  icon.setAttribute('src', favIconUrl);
  document.querySelector('.title .icon').appendChild(icon);

  var link = document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = favIconUrl;
  document.getElementsByTagName('head')[0].appendChild(link);
}

if (title) {
  document.title = title;
  document.querySelector('.title .description').textContent = title;
}

if (darkMode) {
  document.body.classList.add('dark-mode');
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log(changes, namespace)
  if (changes.dark_mode && changes.dark_mode.newValue) {
    document.body.classList.add('dark-mode');
  }
  else {
    document.body.classList.remove('dark-mode');
  }
});

