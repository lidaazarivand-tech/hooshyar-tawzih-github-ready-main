// Hooshyar Web Service Worker - Offline PWA Cache Strategy
const CACHE_NAME = 'hooshyar-static-v1.9.0-brand2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon.png',
  '/logo.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/data/quranFullData.json',
  '/fonts/Shabnam.woff2',
  '/fonts/Shabnam-Bold.woff2',
  '/fonts/Sahel.woff2',
  '/fonts/Sahel-Bold.woff2',
  '/fonts/Samim.woff2',
  '/fonts/Samim-Bold.woff2',
  '/fonts/Parastoo.woff2',
  '/fonts/Parastoo-Bold.woff2'
];

const STATIC_EXACT_PATHS = new Set(PRECACHE_ASSETS);
const STATIC_PREFIXES = ['/assets/', '/audio/', '/fonts/'];

function isAllowlistedStaticRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.search || url.hash) return false;
  return STATIC_EXACT_PATHS.has(url.pathname) ||
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache assets with individual error tolerance
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) {
                return cache.put(url, res);
              }
            })
            .catch((err) => {
              console.warn('[SW] Failed to precache:', url, err);
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('hooshyar-'))
          .map((name) => {
            console.log('[SW] Invaliding stale cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore browser extensions and non-HTTP schemes
  if (!url.protocol.startsWith('http')) return;

  // For external Quran recitation audio streams, allow direct streaming without breaking
  if (url.hostname.includes('mp3quran.net') || url.hostname.includes('islamic.network')) {
    return;
  }

  // Bypass API and dynamic backend requests from SW caching
  if (url.pathname.startsWith('/api/') ||
      (url.pathname.startsWith('/data/') && url.pathname !== '/data/quranFullData.json')) {
    return;
  }

  // Navigation requests (HTML pages): Network-first with offline cache fallback
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  if (!isAllowlistedStaticRequest(request, url)) return;

  // Explicitly allowlisted static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache successful same-origin responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.warn('[SW] Offline fetch fallback failed for:', request.url, error);
          // Graceful fallback for images/icons
          if (request.destination === 'image') {
            return caches.match('/favicon.png');
          }
          throw error;
        });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
