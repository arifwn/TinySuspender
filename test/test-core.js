const { test } = require('node:test');
const assert = require('node:assert');
const { makeChromeMock } = require('./helpers/mock-chrome.js');

const ts = require('../src/tiny-suspender/js/core.js');

test('isMatch: prefix match against bare URL', () => {
  assert.strictEqual(ts.isMatch('https://google.com/', 'https://google.com/maps'), true);
  assert.strictEqual(ts.isMatch('https://google.com/', 'https://example.com/'), false);
});

test('isMatch: regex match when pattern is wrapped in slashes', () => {
  assert.strictEqual(ts.isMatch('/google/', 'https://www.google.com/search'), true);
  assert.strictEqual(ts.isMatch('/^https:\\/\\/mail\\./', 'https://mail.example.com'), true);
  assert.strictEqual(ts.isMatch('/google/', 'https://example.com/'), false);
});

test('isMatch: short patterns that look slash-wrapped are not regex', () => {
  // a 2-char "/x" or "/" shouldn't be treated as regex (length > 2 guard).
  assert.strictEqual(ts.isMatch('//', 'https://example.com/'), false);
});

test('isSystemPage recognizes chrome internal URLs', () => {
  assert.strictEqual(ts.isSystemPage({url: 'chrome://extensions', title: 'Extensions'}), true);
  assert.strictEqual(ts.isSystemPage({url: 'chrome-extension://abc/suspend.html', title: 'X'}), true);
  assert.strictEqual(ts.isSystemPage({url: 'edge://settings', title: 'X'}), true);
  assert.strictEqual(ts.isSystemPage({url: 'about:blank', title: 'X'}), true);
});

test('isSystemPage flags empty/missing URLs and new-tab titles', () => {
  assert.strictEqual(ts.isSystemPage({url: '', title: 'X'}), true);
  assert.strictEqual(ts.isSystemPage({url: 'https://example.com/', title: 'New Tab'}), true);
  assert.strictEqual(ts.isSystemPage(null), true);
});

test('isSystemPage accepts regular web pages', () => {
  assert.strictEqual(ts.isSystemPage({url: 'https://example.com/', title: 'Example'}), false);
});

test('isSuspendable splits state string on colon', () => {
  assert.strictEqual(ts.isSuspendable('suspendable:auto'), true);
  assert.strictEqual(ts.isSuspendable('suspendable:audible'), true);
  assert.strictEqual(ts.isSuspendable('suspended:suspended'), false);
  assert.strictEqual(ts.isSuspendable('nonsuspendible:system_page'), false);
  assert.strictEqual(ts.isSuspendable(null), false);
  assert.strictEqual(ts.isSuspendable(''), false);
});

test('isAutoSuspendable only matches the exact suspendable:auto state', () => {
  assert.strictEqual(ts.isAutoSuspendable('suspendable:auto'), true);
  assert.strictEqual(ts.isAutoSuspendable('suspendable:audible'), false);
  assert.strictEqual(ts.isAutoSuspendable('suspendable:form_changed'), false);
  assert.strictEqual(ts.isAutoSuspendable('suspended:suspended'), false);
  assert.strictEqual(ts.isAutoSuspendable(null), false);
});

test('buildSuspendUrl produces an absolute chrome-extension:// URL', () => {
  // Regression (Chrome 149): a relative 'suspend.html' handed to
  // chrome.tabs.update from the MV3 service worker resolved against the
  // worker's script path (js/), producing chrome-extension://<id>/js/suspend.html
  // — a nonexistent page — so suspended tabs loaded blank. The URL must be
  // rooted at the extension origin.
  ts.setChrome(makeChromeMock().chrome);

  const url = ts.buildSuspendUrl(
    {url: 'https://example.com/page', title: 'Example', favIconUrl: 'https://example.com/fav.ico'},
    {x: 0, y: 120}
  );

  assert.ok(url.startsWith('chrome-extension://test-extension-id/suspend.html?'),
    `suspend URL must be absolute and at the extension root, got: ${url}`);
  assert.ok(!url.includes('/js/suspend.html'),
    'suspend URL must not resolve under the service-worker js/ path');

  const parsed = new URL(url);
  assert.strictEqual(parsed.searchParams.get('url'), 'https://example.com/page');
  assert.strictEqual(parsed.searchParams.get('title'), 'Example');
  assert.strictEqual(parsed.searchParams.get('scroll_y'), '120');
});
