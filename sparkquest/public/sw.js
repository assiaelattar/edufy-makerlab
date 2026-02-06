self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker ...', event);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating Service Worker ....', event);
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through for now. 
    // We can add caching later if offline support is strictly required.
    event.respondWith(fetch(event.request));
});
