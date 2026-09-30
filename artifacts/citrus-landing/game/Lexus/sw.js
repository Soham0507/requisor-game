var CACHE = "lexus-quiz-v11";
var STATIC = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/vehicles/ES.png",
  "/vehicles/NX.png",
  "/vehicles/RZ.png",
  "/vehicles/RX.png",
  "/vehicles/TX.png",
  "/vehicles/TZ.png",
  "/qr/ES.png",
  "/qr/NX.png",
  "/qr/RZ.png",
  "/qr/RX.png",
  "/qr/TX.png",
  "/qr/TZ.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(STATIC);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var path = url.pathname;

  // Analytics / dashboard — always network, never cache
  if (path === "/track" || path === "/sync" || path.startsWith("/dashboard")) {
    return;
  }

  // Vehicle images and QR codes — cache-first (they only change on deploy)
  if (path.startsWith("/vehicles/") || path.startsWith("/qr/") || path.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }

  // Main quiz page — network-first, fall back to cache for offline
  if (path === "/" || path === "") {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match("/") || caches.match(req);
        })
    );
    return;
  }

  // Everything else — network-first, cache fallback
  e.respondWith(
    fetch(req).catch(function () {
      return caches.match(req);
    })
  );
});
