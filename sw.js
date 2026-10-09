/* Keeps the app available offline. Recipes themselves live in the page's local storage,
   not here. Bump VERSION when index.html changes so phones pick up the new copy. */
var VERSION = 'recipe-index-shell-v1';
var FONTS = 'recipe-index-fonts-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // Open instantly from the saved copy, and refresh that copy in the background.
      e.respondWith(caches.match('index.html').then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copy); }); }
          return res;
        }).catch(function () { return null; });
        return hit || net.then(function (r) { return r || new Response('Offline and not saved yet. Open the app once while online.', { status: 503 }); });
      }));
      return;
    }
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
