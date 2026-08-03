const CACHE = 'tierra-fleur-v3';
const ASSETS = ['/manifest.webmanifest', '/assets/tierra-fleur-estate-bg.jpg', '/assets/tierra-fleur-crest.jpeg'];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('/index.html', response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
