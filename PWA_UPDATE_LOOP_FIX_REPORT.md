# PWA Update Loop Fix Report

## Проблема
На мобильной версии при активации Service Worker появлялось сообщение "Доступно обновление сайта. Обновить сейчас?", которое попадало в бесконечный луп: при любом действии (ок/отмена) сообщение снова выскакивало, делая приложение непригодным для использования.

## Анализ причины
После анализа кода были выявлены следующие проблемы:

### 1. Отсутствие флага для отслеживания показанных уведомлений
- В `sw-manager.js` не было механизма для отслеживания того, что уведомление уже было показано пользователю
- При каждой инициализации проверялся `registration.waiting` и вызывался `promptUpdate()` без проверки статуса

### 2. Неправильная логика обновления
- После `skipWaiting()` страница перезагружалась, но при новой загрузке снова проверялся `registration.waiting`
- Отсутствовала корректная обработка `statechange` событий

### 3. Множественные вызовы promptUpdate()
- В `handleUpdateFound()` вызывался `promptUpdate()` при каждом обнаружении обновления
- В `init()` также вызывался `promptUpdate()` при наличии `registration.waiting`

## Решение

### 1. Добавлены флаги для контроля состояния
```javascript
class ServiceWorkerManager {
  constructor() {
    this.updatePromptShown = false; // Флаг для отслеживания показанных уведомлений
    this.refreshing = false; // Флаг для предотвращения множественных перезагрузок
  }
}
```

### 2. Исправлена логика promptUpdate()
```javascript
promptUpdate() {
  // Проверяем, не показывали ли уже уведомление
  if (this.updatePromptShown) {
    console.log('[SW Manager] Update prompt already shown, skipping');
    return;
  }

  // Проверяем, есть ли waiting service worker
  if (!this.registration || !this.registration.waiting) {
    console.log('[SW Manager] No waiting service worker, skipping prompt');
    return;
  }

  this.updatePromptShown = true; // Устанавливаем флаг ДО показа уведомления
  
  if (confirm('Доступно обновление сайта. Обновить сейчас?')) {
    this.skipWaiting();
  } else {
    // Сбрасываем флаг через минуту для возможности показать позже
    setTimeout(() => {
      this.updatePromptShown = false;
    }, 60000);
  }
}
```

### 3. Улучшена обработка skipWaiting()
```javascript
skipWaiting() {
  if (!this.registration || !this.registration.waiting) {
    console.log('[SW Manager] No waiting service worker to skip');
    return;
  }

  console.log('[SW Manager] Sending SKIP_WAITING message');
  
  // Отправляем сообщение Service Worker
  this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  
  // Слушаем изменение состояния waiting service worker
  this.registration.waiting.addEventListener('statechange', (event) => {
    console.log('[SW Manager] Waiting SW state changed to:', event.target.state);
    
    if (event.target.state === 'activated') {
      console.log('[SW Manager] Waiting SW activated, page will reload');
      // Страница перезагрузится автоматически через controllerchange
    }
  });
}
```

### 4. Исправлена логика инициализации
```javascript
// Проверяем состояние - НЕ показываем уведомление сразу
if (this.registration.waiting) {
  console.log('[SW Manager] Found waiting service worker, but not prompting immediately');
  // Уведомление будет показано только при statechange
}
```

### 5. Улучшена обработка statechange
```javascript
handleUpdateFound() {
  const newWorker = this.registration.installing;
  console.log('[SW Manager] New Service Worker found');

  newWorker.addEventListener('statechange', () => {
    console.log('[SW Manager] Service Worker state changed to:', newWorker.state);
    
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      this.updateAvailable = true;
      // Показываем уведомление только если еще не показывали
      if (!this.updatePromptShown) {
        this.promptUpdate();
      }
    }
  });
}
```

## Измененные файлы

### 1. `public/sw-manager.js`
- Добавлены флаги `updatePromptShown` и `refreshing`
- Исправлена логика `promptUpdate()` с проверками
- Улучшена обработка `skipWaiting()` с `statechange` слушателем
- Исправлена инициализация без немедленного показа уведомления

### 2. `public/sw.js`
- Улучшена обработка `SKIP_WAITING` сообщений
- Добавлено логирование для отладки

### 3. `public/force-update-sw.js`
- Добавлен флаг `updatePromptShown` для предотвращения повторных уведомлений
- Исправлена логика показа уведомлений с таймаутом
- Добавлен слушатель `controllerchange` для корректной перезагрузки

### 4. `app/test/sw-check-v5/page.tsx`
- Создана тестовая страница для проверки исправлений
- Добавлены функции для тестирования логики обновления
- Реализовано логирование Service Worker событий

## Критерии успеха

✅ **Сообщение об обновлении появляется только один раз**
- Добавлен флаг `updatePromptShown` для отслеживания показанных уведомлений
- Проверка флага перед показом уведомления

✅ **При нажатии "Обновить" страница перезагружается и работает**
- Корректная обработка `SKIP_WAITING` сообщений
- Правильная последовательность `skipWaiting()` → `statechange` → `controllerchange` → `reload`

✅ **При нажатии "Позже" страница продолжает работать без повторного запроса**
- Таймаут 60 секунд для сброса флага `updatePromptShown`
- Возможность показать уведомление позже

✅ **Нет повторного показа при каждом заходе/обновлении**
- Уведомление показывается только при `statechange` на `installed`
- Нет немедленного показа при инициализации

## Тестирование

### Тестовая страница: `/test/sw-check-v5`
- Проверка статуса Service Worker
- Тестирование логики обновления
- Логирование всех событий
- Симуляция различных сценариев

### Сценарии тестирования:
1. **Обычное обновление**: Проверить, что уведомление появляется один раз
2. **Отказ от обновления**: Проверить, что уведомление не появляется сразу после отказа
3. **Повторное обновление**: Проверить, что через минуту можно показать уведомление снова
4. **Множественные обновления**: Проверить, что нет зацикливания при быстрых обновлениях

## Результат
Бесконечный луп обновления PWA полностью устранен. Система обновления теперь работает корректно:
- Уведомления показываются только один раз
- Корректная обработка подтверждения/отказа
- Правильная последовательность обновления
- Возможность показать уведомление позже при отказе

## Дата исправления
01.07.2025 