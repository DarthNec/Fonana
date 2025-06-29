// Service Worker для Fonana PWA v3
const CACHE_NAME = 'fonana-v3';
const RUNTIME_CACHE = 'fonana-runtime-v2';

// Ресурсы для предварительного кеширования
const urlsToCache = [
  '/',
  '/feed',
  '/creators',
  '/favicon.ico',
  '/fonanaLogo1.png',
  '/manifest.json'
];

// Проверка, нужно ли обрабатывать запрос
function shouldHandleRequest(request) {
  const url = new URL(request.url);
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return false;
  }
  
  // Пропускаем запросы с других доменов
  if (url.origin !== self.location.origin) {
    return false;
  }
  
  // Пропускаем специальные протоколы
  if (!url.protocol.startsWith('http')) {
    return false;
  }
  
  // Пропускаем WebSocket
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return false;
  }
  
  // Пропускаем API запросы
  if (url.pathname.startsWith('/api/')) {
    return false;
  }
  
  // Пропускаем WebSocket пути
  if (url.pathname.includes('/ws') || url.pathname.includes('websocket')) {
    return false;
  }
  
  // Пропускаем hot-reload в development
  if (url.pathname.includes('_next/webpack-hmr') || 
      url.pathname.includes('__nextjs') ||
      url.pathname.includes('_next/static/development')) {
    return false;
  }
  
  // Пропускаем chrome-extension и другие расширения
  if (url.href.includes('chrome-extension://') || 
      url.href.includes('moz-extension://')) {
    return false;
  }
  
  return true;
}

// Install Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker v3...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // Кешируем каждый ресурс отдельно с обработкой ошибок
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err.message);
            // Продолжаем установку даже если некоторые ресурсы не удалось закешировать
            return Promise.resolve();
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker v3...');
  
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[SW] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        // Берем контроль над всеми клиентами
        return self.clients.claim();
      })
      .catch(err => {
        console.error('[SW] Activation failed:', err);
      })
  );
});

// Fetch обработчик
self.addEventListener('fetch', event => {
  // Сначала проверяем, нужно ли обрабатывать запрос
  if (!shouldHandleRequest(event.request)) {
    // Пропускаем запрос без обработки
    return;
  }
  
  // Обрабатываем только разрешенные запросы
  event.respondWith(
    // Сначала пробуем сеть
    fetch(event.request)
      .then(response => {
        // Проверяем валидность ответа
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Кешируем успешный ответ
        const responseToCache = response.clone();
        
        caches.open(RUNTIME_CACHE)
          .then(cache => {
            // Кешируем только HTML, CSS, JS и изображения
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html') ||
                contentType.includes('text/css') ||
                contentType.includes('javascript') ||
                contentType.includes('image/')) {
              cache.put(event.request, responseToCache);
            }
          })
          .catch(err => {
            console.warn('[SW] Cache put failed:', err);
          });
        
        return response;
      })
      .catch(error => {
        // При ошибке сети пытаемся найти в кеше
        console.log('[SW] Fetch failed, trying cache:', event.request.url);
        
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Found in cache:', event.request.url);
              return cachedResponse;
            }
            
            // Специальная обработка для навигационных запросов
            if (event.request.mode === 'navigate') {
              return caches.match('/')
                .then(response => {
                  if (response) {
                    console.log('[SW] Returning cached home page');
                    return response;
                  }
                  // Если даже главная страница не в кеше
                  return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  });
                });
            }
            
            // Для изображений возвращаем placeholder если есть
            if (event.request.destination === 'image') {
              return caches.match('/fonanaLogo1.png')
                .then(response => {
                  if (response) {
                    return response;
                  }
                  // Пустое изображение 1x1 как fallback
                  return new Response(null, {
                    status: 404,
                    statusText: 'Not Found'
                  });
                });
            }
            
            // Для остальных ресурсов
            return new Response('Resource not available offline', {
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

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches');
    event.waitUntil(
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('[SW] Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(() => {
          console.log('[SW] All caches cleared');
        })
        .catch(err => {
          console.error('[SW] Failed to clear caches:', err);
        })
    );
  }
});

// Обработка ошибок
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
}); 