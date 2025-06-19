# Исправление проблемы с реферальными cookies

## Описание проблемы
При переходе по ссылке `fonana.me/dogwater` пользователь получал сообщение, что его пригласил @create вместо @dogwater.

## Причина
У пользователя уже была сохранена старая cookie или localStorage с реферером "create", и middleware работает по принципу "first visitor wins" - не перезаписывает существующую cookie.

## Решение

### 1. Для пользователей - очистка старых данных

Создан скрипт `scripts/check-referral-cookies.js`, который можно запустить в консоли браузера:

```javascript
// Проверка текущих данных
function checkReferralData() {
  console.log('=== Проверка реферальных данных ===\n');
  
  // Cookies
  const cookies = document.cookie.split(';');
  const referrerCookie = cookies.find(c => c.trim().startsWith('fonana_referrer='));
  console.log('Cookie:', referrerCookie || 'не найдена');
  
  // LocalStorage
  const storedReferrer = localStorage.getItem('fonana_referrer');
  console.log('LocalStorage:', storedReferrer || 'не найден');
  
  // Meta tag
  const metaTag = document.querySelector('meta[name="x-fonana-referrer"]');
  console.log('Meta tag:', metaTag?.getAttribute('content') || 'не найден');
}

// Очистка данных
function clearReferralData() {
  localStorage.removeItem('fonana_referrer');
  localStorage.removeItem('fonana_referrer_timestamp');
  document.cookie = 'fonana_referrer=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  console.log('✅ Данные очищены! Обновите страницу.');
}
```

### 2. Исправление дизайна Dashboard

Проблема: SubscriptionManager был помещен в узкую колонку (lg:col-span-1), что ломало его grid-структуру.

Решение: SubscriptionManager теперь отображается на полную ширину страницы в отдельной секции.

## Как тестировать

1. Очистите старые cookies/localStorage (см. скрипт выше)
2. Перейдите по ссылке `https://fonana.me/dogwater`
3. Должно появиться уведомление "You were invited by @dogwater"
4. При регистрации пользователь будет привязан к dogwater как реферер

## Технические детали

- Middleware проверяет и устанавливает cookie только для новых посетителей
- ReferralNotification компонент читает реферера из meta-тега или localStorage
- Dashboard теперь имеет правильную структуру для SubscriptionManager

## Статус
✅ Исправлено и задеплоено на продакшн 