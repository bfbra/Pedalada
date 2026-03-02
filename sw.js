// Service Worker - Pedalada dos Estados v2
// Network-first para HTML, cache-first para assets estaticos

var CACHE_NAME = 'pedalada-v2';
var STATIC_ASSETS = [
    '/Pedalada/',
    '/Pedalada/index.html',
    '/Pedalada/logo.png',
    '/Pedalada/splash-logo.png',
    '/Pedalada/apoio.png',
    '/Pedalada/manifest.json'
];

// Instalacao
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Ativacao - limpa caches antigos
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// Fetch
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Ignorar requests que nao sao GET
    if (event.request.method !== 'GET') return;

    // Ignorar requests do Firebase (websocket, API)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com')) {
        return;
    }

    // Network-first para navegacao (HTML) - sempre pega a versao mais nova
    if (event.request.mode === 'navigate' ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then(function(response) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(function() {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first para assets estaticos (imagens, CSS, JS libs)
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request).then(function(response) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
                return response;
            });
        })
    );
});
