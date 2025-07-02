// Service Worker для Fonana PWA v7 - УПРОЩЕННАЯ ВЕРСИЯ
// БЕЗ АВТОМАТИЧЕСКИХ ОБНОВЛЕНИЙ - ТОЛЬКО КЕШИРОВАНИЕ
const SW_VERSION = 'v7-simple-20250702';
const CACHE_NAME = 'fonana-v7';

// Ресурсы для предварительного кеширования
const urlsToCache = [
  '/',
  '/feed',
  '/creators',
  '/favicon.ico',
  '/fonanaLogo1.png',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log(`[SW ${SW_VERSION}] Installing Service Worker...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW ${SW_VERSION}] Caching app shell`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Installation complete`);
        // Принудительная активация для обновлений
        return self.skipWaiting();
      })
      .catch(err => {
        console.error(`[SW ${SW_VERSION}] Installation failed:`, err);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log(`[SW ${SW_VERSION}] Activating Service Worker...`);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Удаляем старые кеши
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[SW ${SW_VERSION}] Removing old cache:`, cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Activation complete`);
        // Принудительно заявляем права на все клиенты
        return self.clients.claim();
      })
      .catch(err => {
        console.error(`[SW ${SW_VERSION}] Activation failed:`, err);
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW ${SW_VERSION}] Received SKIP_WAITING message`);
    self.skipWaiting();
  }
});

// Fetch обработчик - простой cache-first стратегия
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Пропускаем API запросы
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Пропускаем изображения постов
  if (url.pathname.startsWith('/posts/')) {
    return;
  }
  
  // Пропускаем WebSocket
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  // Пропускаем hot-reload в development
  if (url.pathname.includes('_next/webpack-hmr')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Кешируем только успешные GET запросы
            if (response.status === 200 && event.request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          });
      })
  );
});

// Обработка ошибок
self.addEventListener('error', event => {
  console.error(`[SW ${SW_VERSION}] Error:`, event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error(`[SW ${SW_VERSION}] Unhandled rejection:`, event.reason);
}); 