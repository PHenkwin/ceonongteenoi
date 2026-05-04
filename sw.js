// ==================== SW.JS ====================
// Service Worker for PWA

const CACHE_NAME = 'stock-ceo-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/storage-service.js',
    '/js/firebase-service.js',
    '/js/car-model.js',
    '/js/ui-render.js',
    '/js/ui-modal.js',
    '/js/crm.js',
    '/js/quote-engine.js',
    '/js/auth.js',
    '/js/main.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('SW: Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('SW: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('SW: Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('SW: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - Network First strategy for HTML, Cache First for others
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip Firebase and external API requests
    if (
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('unsplash.com') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        return; // Let browser handle
    }

    // For HTML requests - Network First
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the latest version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline - return cached version
                    return caches.match(request);
                })
        );
        return;
    }

    // For other assets - Cache First
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version immediately
                    // Fetch update in background
                    fetch(request).then((response) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response);
                        });
                    }).catch(() => {});
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                return fetch(request).then((response) => {
                    // Cache for future
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                });
            })
            .catch(() => {
                // Offline and not cached
                if (request.destination === 'image') {
                    // Return a placeholder for images
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#1a1a1a" width="400" height="300"/><text fill="#666" x="200" y="150" text-anchor="middle" font-size="20">📷 Offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
                return new Response('Offline - Please check your connection', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Handle messages from the page
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});