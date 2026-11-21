// Eyvan Cafe Digital Menu — Service Worker DISABLED (kill-switch).
//
// This file intentionally replaces the old caching worker. Browsers that
// installed the old worker fetch this new version on their next visit; it
// clears every cache the old worker created, unregisters itself, and reloads
// open tabs so they go back to plain network fetches.
//
// DO NOT delete this file: a missing sw.js leaves the old worker installed
// on devices that already have it (a failed update keeps the old worker).
// DO NOT re-register a worker from the app without a decision to bring the
// service worker back — see the performance audit (NO service worker for v1:
// stale-menu risk after an admin publish).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
