const CACHE_NAME = 'hesed-v2';

self.addEventListener('install', (event) => {
  // Take over immediately; don't precache pages — they can be redirects.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches, including the poisoned hesed-v1.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Page navigations: ALWAYS go to the network. Never serve cached HTML.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html><body style="font-family: Georgia, serif; background: #faf8f5; color: #5c3d1e; text-align: center; padding-top: 4rem;"><h1>You&rsquo;re offline</h1><p>Reconnect to continue your study.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          )
      )
    );
    return;
  }

  // Static assets: cache-first, network fallback. Never cache redirects.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic' && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
