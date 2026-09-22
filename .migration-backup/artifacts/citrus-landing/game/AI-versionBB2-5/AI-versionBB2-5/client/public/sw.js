const CACHE_VERSION = 'avx-v11';

const PRECACHE_URLS = [
  '/',
  '/favicon.png',
  '/avx-icon-overlay.png',
  '/avx-logo-ticker.png',
  '/ribbon-banner.png',
  '/fonts/digital-7.ttf',
  '/ball/step2.jpg',
  '/ball/step3.jpg',
  '/ball/sport-ball-isolated.png',
  '/bb3/img1_opt.jpeg',
  '/hand/hand.png',
];

const VIDEO_URLS = [
  '/newbb/position.mp4',
  '/newbb/hit1.mp4',
  '/newbb/hit2.mp4',
  '/newbb/hit3.mp4',
  '/newbb/miss.mp4',
  '/newbb/last.mp4',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all([
        ...PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => console.warn('SW: failed to cache', url))
        ),
        ...VIDEO_URLS.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => console.warn('SW: failed to cache video', url))
        ),
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function serveRangeRequest(cachedResponse, request) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return cachedResponse;

  return cachedResponse.arrayBuffer().then((buf) => {
    const bytes = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!bytes) return cachedResponse;

    const start = parseInt(bytes[1], 10);
    const end = bytes[2] ? parseInt(bytes[2], 10) : buf.byteLength - 1;
    const chunk = buf.slice(start, end + 1);

    return new Response(chunk, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
        'Content-Length': chunk.byteLength,
        'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
        'Accept-Ranges': 'bytes',
      },
    });
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;
  if (url.pathname.includes('__vite') || url.pathname.includes('@vite') || url.pathname.includes('node_modules')) return;

  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  const isVideo = url.pathname.endsWith('.mp4');

  if (isVideo) {
    event.respondWith(
      caches.match(url.pathname).then((cached) => {
        if (cached) {
          if (event.request.headers.get('range')) {
            return serveRangeRequest(cached, event.request);
          }
          return cached;
        }
        return fetch(event.request)
          .then((response) => {
            if (response.ok && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(url.pathname, clone));
            }
            return response;
          })
          .catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || new Response('<html><body><h1>Offline</h1></body></html>', {
              headers: { 'Content-Type': 'text/html' },
            }))
        )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then((cached) => cached || new Response('', { status: 503, statusText: 'Offline' }))
      )
  );
});
