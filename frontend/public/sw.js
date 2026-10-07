/*
 * CivicPulse PWA Service Worker (Offline Rural Field Mode)
 * Production-grade runtime caching with stale-while-revalidate for hashed bundles.
 */
const CACHE_NAME = 'civicpulse-field-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/engineering',
  '/map',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Service Worker cache.addAll failed partially:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass-through API, WebSocket, and Vite development server modules
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/ws/') ||
    event.request.url.includes('/@vite/') ||
    event.request.url.includes('/node_modules/') ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('?v=')
  ) {
    return;
  }

  // Handle GET requests with Cache-First / Network-Fallback + Runtime Caching
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network and dynamically cache valid assets (scripts, styles, fonts, images)
        return fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === 'basic' &&
              (event.request.url.includes('/assets/') ||
               event.request.url.includes('/fonts/') ||
               event.request.destination === 'script' ||
               event.request.destination === 'style' ||
               event.request.destination === 'font' ||
               event.request.destination === 'image')
            ) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // SPA fallback: on navigation requests when offline, return index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});
