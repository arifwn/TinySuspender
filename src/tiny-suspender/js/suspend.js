
let suspendUrl = new URL(location.href);
let pageUrl = suspendUrl.searchParams.get('url');
let favIconUrl = suspendUrl.searchParams.get('favIconUrl');
let title = suspendUrl.searchParams.get('title');

document.onclick = () => {
  location = pageUrl;
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

// chrome-extension://dbjhggcaninmnckbkkhjdhbgnalpddlc/suspend.html?url=https%3A%2F%2Fwww.google.co.id%2F%3Fgws_rd%3Dcr%2Cssl%26ei%3DSvNCWN2vKIfevgT7j53YAg&title=Google&favIconUrl=https%3A%2F%2Fwww.google.co.id%2Fimages%2Fbranding%2Fproduct%2Fico%2Fgoogleg_lodp.ico
