const CACHE_NAME = 'qr-pro-v1.0.3';
const STATIC_CACHE_NAME = 'qr-pro-static-v1.0.3';
const DYNAMIC_CACHE_NAME = 'qr-pro-dynamic-v1.0.3';

// Korrekte Pfade für GitHub Pages
const STATIC_FILES = [
  '/qr-code-pwa/',
  '/qr-code-pwa/index.html',
  '/qr-code-pwa/style.css',
  '/qr-code-pwa/app.js',
  '/qr-code-pwa/manifest.json',
  '/qr-code-pwa/icons/icon-256x256.png',
  '/qr-code-pwa/icons/icon-512x512.png',
  'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Pre-caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Error caching static files:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch Strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests außer CDNs
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.jsdelivr.net') && 
      !event.request.url.includes('unpkg.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(fetchResponse => {
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();

            if (event.request.url.includes('cdn.') || event.request.url.includes('unpkg.com')) {
              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            } else {
              caches.open(DYNAMIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return fetchResponse;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            
            if (event.request.destination === 'document') {
              return caches.match('/qr-code-pwa/index.html');
            }
            
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
