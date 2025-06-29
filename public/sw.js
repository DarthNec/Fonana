// Service Worker для Fonana PWA
const CACHE_NAME = 'fonana-v2';
const RUNTIME_CACHE = 'fonana-runtime-v1';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache');
        // Добавляем ресурсы в кеш с обработкой ошибок
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting()) // Активируем новый SW сразу
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем WebSocket запросы
  if (event.request.url.includes('/ws') || event.request.url.includes('websocket')) {
    return;
  }

  // Пропускаем API запросы - они всегда должны идти в сеть
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Возвращаем ошибку для API запросов
          return new Response(
            JSON.stringify({ error: 'Network error' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Для остальных запросов используем стратегию "Network First, Cache Fallback"
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Проверяем, что ответ корректный
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Клонируем ответ для кеширования
        const responseToCache = response.clone();

        caches.open(RUNTIME_CACHE)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // При ошибке сети пытаемся найти в кеше
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('[SW] Serving from cache:', event.request.url);
              return response;
            }

            // Если это навигационный запрос, возвращаем главную страницу
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }

            // Для изображений возвращаем placeholder
            if (event.request.destination === 'image') {
              return caches.match('/fonanaLogo1.png');
            }

            // Возвращаем офлайн страницу или пустой ответ
            return new Response('Offline - resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Update Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Берем контроль над всеми клиентами
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
}); 