const CACHE_NAME = 'streamhub-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/themes.css',
    '/css/main.css',
    '/css/components.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/storage.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/player.js',
    '/js/ui.js',
    '/js/router.js',
    '/js/app.js',
    '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip API calls and streaming URLs
    if (event.request.url.includes('api.themoviedb.org') || 
        event.request.url.includes('embed') ||
        event.request.url.includes('vidsrc')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
