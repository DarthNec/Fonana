# Решение проблемы с версиями и Service Worker

## Системные изменения

### 1. Исправление порядка деплоя

**Проблема**: Версия генерируется ПОСЛЕ сборки, поэтому в бандлы попадает старая версия.

**Решение**: Генерировать версию ДО сборки.

```bash
# deploy-to-production.sh
# BEFORE npm run build
VERSION=$(date +%Y%m%d-%H%M%S)
COMMIT=$(git rev-parse --short HEAD)
echo "export const APP_VERSION = '$VERSION-$COMMIT';" > lib/version.ts
git add lib/version.ts
git commit -m "chore: update version to $VERSION-$COMMIT"

# THEN build
npm run build
```

### 2. Статический импорт версии

**Проблема**: Динамический require() кешируется webpack.

**Решение**: Использовать статический импорт.

```typescript
// components/Footer.tsx
import { APP_VERSION } from '@/lib/version'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 right-0 p-2 text-xs text-gray-400 z-50">
      <span className="opacity-50 hover:opacity-100 transition-opacity">
        v{APP_VERSION}
      </span>
    </footer>
  )
}
```

### 3. Версионирование Service Worker

**Проблема**: SW кешируется браузером до 24 часов.

**Решение**: Добавить версию в URL регистрации.

```typescript
// components/ServiceWorkerRegistration.tsx
import { APP_VERSION } from '@/lib/version'

useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`/sw.js?v=${APP_VERSION}`)
  }
}, [])
```

### 4. Автообновление Service Worker

**Проблема**: SW не обновляется автоматически.

**Решение**: Добавить в sw.js механизм самообновления.

```javascript
// public/sw.js
const SW_VERSION = 'v6-TIMESTAMP' // Обновляется при деплое

self.addEventListener('install', event => {
  // Пропускаем ожидание и сразу активируем новую версию
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  // Удаляем все старые кеши
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes(SW_VERSION)) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Берем контроль над всеми клиентами
      return self.clients.claim()
    })
  )
})
```

### 5. Улучшенный force-refresh

**Проблема**: Проверяет только timestamp, не работает надежно.

**Решение**: Проверять реальную версию через API.

```javascript
// public/force-refresh.js
(async function() {
  try {
    const response = await fetch('/api/version')
    const { version } = await response.json()
    const storedVersion = localStorage.getItem('fonana-version')
    
    if (storedVersion && storedVersion !== version) {
      // Очищаем все кеши
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
      }
      
      // Отменяем регистрацию SW
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.unregister()
        }
      }
      
      localStorage.setItem('fonana-version', version)
      window.location.reload(true)
    } else {
      localStorage.setItem('fonana-version', version)
    }
  } catch (e) {
    console.error('Version check failed:', e)
  }
})()
```

### 6. API endpoint для версии

```typescript
// app/api/version/route.ts
import { APP_VERSION } from '@/lib/version'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    timestamp: new Date().toISOString()
  })
}
```

### 7. Правильная nginx конфигурация

```nginx
# Service Worker - без кеша
location = /sw.js {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# force-refresh.js - без кеша
location = /force-refresh.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# Next.js статика - с кешем (файлы имеют хеши)
location /_next/static/ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# API - без кеша
location /api/ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# HTML страницы - без кеша
location / {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Порядок внедрения

1. Создать заглушку `lib/version.ts` с дефолтной версией
2. Обновить Footer на статический импорт
3. Добавить API endpoint для версии
4. Обновить force-refresh.js
5. Обновить ServiceWorkerRegistration
6. Обновить sw.js с новой версией (v6)
7. Обновить deploy скрипт
8. Обновить nginx конфигурацию
9. Задеплоить изменения

## Ожидаемый результат

После внедрения:
- Версия будет корректно встраиваться в бандлы при сборке
- Service Worker будет автоматически обновляться
- force-refresh будет надежно определять новые версии
- Пользователи будут автоматически получать обновления без ручной очистки кеша 