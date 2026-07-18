const CACHE = 'lifeboat-v3.2.0-table2';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=3.2.0-table2',
  './assets/ui-icons.svg',
  './assets/game-icons.svg',
  './assets/art/character-atlas.webp',
  './assets/art/lifeboat.webp',
  './assets/art/tabletop-v2.webp',
  './assets/lucide-LICENSE.txt',
  './src/data.js?v=3.2.0-table2',
  './src/i18n.js?v=3.2.0-table2',
  './src/engine.js?v=3.2.0-table2',
  './src/app.js?v=3.2.0-table2',
  './assets/icon.svg',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const update = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || update;
    }),
  );
});
