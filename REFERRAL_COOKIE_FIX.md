# Исправление проблемы с реферальными cookies

## Описание проблемы
При переходе по ссылке `fonana.me/dogwater` пользователь получал сообщение:
1. Сначала: "You were invited by @create" 
2. Потом: "You were invited by @404"

## Причины

### Проблема 1: @create вместо @dogwater
У пользователя была старая cookie с реферером "create", и middleware работает по принципу "first visitor wins" - не перезаписывает существующую cookie.

### Проблема 2: @404 вместо @dogwater  
1. На продакшн сервере пользователь существует с nickname "Dogwater" (с большой буквы)
2. URL использует "dogwater" (с маленькой буквы)
3. API поиск пользователя не находил "dogwater", возвращал 404
4. Middleware устанавливал "404" как реферера

## Решение

### 1. Исправлен middleware
- Добавлена проверка, чтобы игнорировать числовые пути (404, 500 и т.д.)
- Добавлена валидация: username должен начинаться с буквы
- Игнорируются пути: `/404`, `/_error`, и чисто числовые пути

```typescript
// Дополнительная валидация
if (/^\d+$/.test(username) || username === 'undefined' || username === 'null') {
  return response
}

// Username должен начинаться с буквы
if (!existingReferrer && username && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(username)) {
  // Устанавливаем cookie
}
```

### 2. Для пользователей - очистка старых данных

Создан скрипт `scripts/check-referral-cookies.js`:

```javascript
// Очистка данных
function clearReferralData() {
  localStorage.removeItem('fonana_referrer');
  localStorage.removeItem('fonana_referrer_timestamp');
  document.cookie = 'fonana_referrer=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  console.log('✅ Данные очищены! Обновите страницу.');
}
```

### 3. Исправление дизайна Dashboard
SubscriptionManager теперь отображается на полную ширину страницы.

## Важное замечание о регистре
На продакшн сервере пользователь существует как "Dogwater" (с большой буквы).
Правильная реферальная ссылка: https://fonana.me/Dogwater

## Как тестировать

1. Очистите старые cookies/localStorage (см. скрипт выше)
2. Перейдите по ссылке `https://fonana.me/Dogwater` (с большой буквы!)
3. Должно появиться уведомление "You were invited by @dogwater"
4. При регистрации пользователь будет привязан к Dogwater как реферер

## Технические детали

- Middleware проверяет и устанавливает cookie только для новых посетителей
- Игнорирует числовые пути и страницы ошибок
- Username должен начинаться с буквы
- ReferralNotification компонент читает реферера из meta-тега или localStorage
- Dashboard теперь имеет правильную структуру для SubscriptionManager

## Статус
✅ Исправлено и задеплоено на продакшн
✅ Пользователь Dogwater существует на продакшн сервере 