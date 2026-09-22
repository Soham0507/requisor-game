const CACHE_NAME = 'appviewx-shootout-v17';
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/fonts/digital-7.ttf',
  '/hand/hand.png',
  '/ball/sport-ball-isolated.png',
  '/ball/step2.png',
  '/ball/step3.png',
  '/bb3/position.mp4',
  '/bb3/success.mp4',
  '/bb3/fail.mp4',
  '/bb3/img1.jpeg',
  '/bb3/img2.jpeg',
  '/bb3/img3.jpeg',
  '/bb3/avx-icon.png',
  '/bb3/avx-wordmark.png',
  '/bb/court_bg.png',
  '/bb/appviewx-logo.svg',
  '/bb/appviewx_logo.svg',
  '/bb/banner.png',
  '/bb/court.png',
  '/bb/court3.png',
  '/bb/court4.png',
  '/bb/logo.svg',
  '/bb/logo2.svg',
  '/bb/position.png',
  '/bb2/bg.jpeg',
  '/bb2/success1.mp4',
  '/bb2/success2.mp4',
  '/bb2/miss2.mp4',
  '/bb2/miss3.mp4',
  '/bb3/bg.jpeg'
];

const API_CACHE = 'appviewx-api-v1';
const OFFLINE_QUEUE_KEY = 'offline-score-queue';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => console.warn('Failed to cache:', url)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE && key !== 'offline-queue')
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/api/scores') {
    event.respondWith(handleScorePost(event.request));
    return;
  }

  if (event.request.method === 'POST' && url.pathname === '/api/capture-email') {
    event.respondWith(handleEmailPost(event.request));
    return;
  }

  if (url.pathname.startsWith('/api/scores')) {
    event.respondWith(handleApiGet(event.request));
    return;
  }

  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
        }
        return response;
      }).catch(() => {
        return caches.match('/').then((cached) => {
          if (cached) return cached;
          return new Response('<!DOCTYPE html><html><body><h1>Offline - Please reconnect</h1></body></html>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

async function handleApiGet(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(API_CACHE);
      await cache.put(request, clone);
      return response;
    }
    throw new Error('Network response not ok');
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const localScores = await getOfflineQueue('offline-local-scores');
    return new Response(JSON.stringify(localScores), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleScorePost(request) {
  const body = await request.clone().json();
  await storeLocalScore(body);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await flushOfflineQueue();
      return response;
    }
    throw new Error('Failed');
  } catch {
    await queueOfflineScore(body);
    return new Response(JSON.stringify({ ...body, id: Date.now(), offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleEmailPost(request) {
  const body = await request.clone().json();
  try {
    const response = await fetch(request);
    return response;
  } catch {
    await queueOfflineData('offline-email-queue', body);
    return new Response(JSON.stringify({ success: true, offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function storeLocalScore(data) {
  const scores = await getOfflineQueue('offline-local-scores');
  scores.push({ ...data, id: Date.now(), createdAt: new Date().toISOString() });
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, 100);
  await saveOfflineQueue('offline-local-scores', trimmed);
}

async function queueOfflineScore(data) {
  const queue = await getOfflineQueue(OFFLINE_QUEUE_KEY);
  queue.push({ type: 'score', data, timestamp: Date.now() });
  await saveOfflineQueue(OFFLINE_QUEUE_KEY, queue);
}

async function queueOfflineData(key, data) {
  const queue = await getOfflineQueue(key);
  queue.push({ type: 'email', data, timestamp: Date.now() });
  await saveOfflineQueue(key, queue);
}

async function getOfflineQueue(key) {
  try {
    const cache = await caches.open('offline-queue');
    const response = await cache.match(key);
    if (response) return response.json();
  } catch {}
  return [];
}

async function saveOfflineQueue(key, queue) {
  const cache = await caches.open('offline-queue');
  await cache.put(key, new Response(JSON.stringify(queue), {
    headers: { 'Content-Type': 'application/json' }
  }));
}

async function flushOfflineQueue() {
  const scoreQueue = await getOfflineQueue(OFFLINE_QUEUE_KEY);
  const emailQueue = await getOfflineQueue('offline-email-queue');

  for (const item of scoreQueue) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
    } catch {
      return;
    }
  }
  await saveOfflineQueue(OFFLINE_QUEUE_KEY, []);

  for (const item of emailQueue) {
    try {
      await fetch('/api/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
    } catch {
      return;
    }
  }
  await saveOfflineQueue('offline-email-queue', []);
}

self.addEventListener('message', (event) => {
  if (event.data === 'flush-queue') {
    flushOfflineQueue();
  }
});
