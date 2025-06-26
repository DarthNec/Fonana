# Исправление реферальной системы Fonana

## Дата: 27 января 2025

## Проблемы которые были найдены и исправлены

### 1. Постоянное появление Welcome окна
**Проблема**: Пользователи жаловались что окно "Welcome to Fonana" появляется в случайные моменты с рандомными значениями (feed, 404).

**Причина**: 
- Middleware передавал существующего реферера через HTTP header на КАЖДОМ запросе
- ReferralNotification показывал уведомление каждый раз когда видел meta tag с реферером
- Это создавало цикл: cookie → header → meta tag → уведомление

**Решение**:
- Теперь header с реферером передается ТОЛЬКО при первой установке cookie
- Добавлен флаг `X-Is-New-Referral` который указывает что это новая установка
- ReferralNotification показывается только при наличии этого флага

### 2. Неправильная валидация путей
**Проблема**: Системные пути типа `/feed`, `/404` могли быть приняты за профили пользователей.

**Причина**:
- Недостаточная фильтрация системных путей в middleware
- Слабая валидация формата username

**Решение**:
- Создан полный список системных путей `SYSTEM_PATHS`
- Усилена валидация username:
  - Должен начинаться с буквы
  - Минимум 3 символа
  - Исключены специальные значения: undefined, null, feed, error

### 3. Спам уведомлениями
**Проблема**: Уведомление могло показываться многократно для одного и того же реферера.

**Решение**:
- Добавлено сохранение показанных уведомлений в `localStorage`
- Уведомление показывается только один раз для каждого реферера
- Автоматическая очистка старых данных через 7 дней

## Технические детали

### Изменения в middleware.ts

1. **Улучшенная валидация путей**:
```typescript
const isSystemPath = SYSTEM_PATHS.some(path => pathname.startsWith(path)) || 
                    pathname.includes('.') || 
                    pathname === '/'

const isProfileVisit = !isSystemPath && 
                      pathname.match(/^\/[a-zA-Z][a-zA-Z0-9_-]*$/) &&
                      pathname.length > 1
```

2. **Передача header только при новой установке**:
```typescript
if (!existingReferrer && username) {
  response.cookies.set('fonana_referrer', username, {...})
  response.headers.set('X-Fonana-Referrer', username)
  response.headers.set('X-Is-New-Referral', 'true')
}
// НЕ передаем существующий referrer
```

### Изменения в ReferralNotification.tsx

1. **Проверка флага новой установки**:
```typescript
const isNewReferral = document.querySelector('meta[name="x-is-new-referral"]')
  ?.getAttribute('content') === 'true'
```

2. **Запоминание показанных уведомлений**:
```typescript
const shownReferrals = JSON.parse(
  localStorage.getItem('fonana_shown_referral_notifications') || '[]'
)
if (!shownReferrals.includes(referrerFromHeader)) {
  // Показываем уведомление
  shownReferrals.push(referrerFromHeader)
  localStorage.setItem('fonana_shown_referral_notifications', 
    JSON.stringify(shownReferrals))
}
```

## Тестирование

### Как проверить что все работает:

1. **Новый пользователь с реферальной ссылкой**:
   - Очистите cookies и localStorage
   - Перейдите по ссылке типа `fonana.me/username`
   - Должно появиться ONE уведомление Welcome
   - При обновлении страницы уведомление НЕ должно появляться снова

2. **Проверка системных путей**:
   - Перейдите на `/feed`, `/404`, `/error`
   - НЕ должна устанавливаться реферальная cookie
   - НЕ должно появляться уведомление

3. **Проверка невалидных username**:
   - `/123` - числовой путь, должен игнорироваться
   - `/ab` - слишком короткий, минимум 3 символа
   - `/3user` - начинается с цифры, должен игнорироваться

### Скрипт для диагностики (в браузере):

```javascript
// Запустите в консоли браузера на fonana.me
function checkReferralState() {
  console.log('=== Referral System State ===');
  
  // Cookies
  const cookies = document.cookie.split(';');
  const referrerCookie = cookies.find(c => c.trim().startsWith('fonana_referrer='));
  console.log('Cookie:', referrerCookie?.trim() || 'Not set');
  
  // LocalStorage
  console.log('LocalStorage referrer:', localStorage.getItem('fonana_referrer'));
  console.log('Shown notifications:', localStorage.getItem('fonana_shown_referral_notifications'));
  
  // Meta tags
  const referrerMeta = document.querySelector('meta[name="x-fonana-referrer"]');
  const isNewMeta = document.querySelector('meta[name="x-is-new-referral"]');
  console.log('Meta referrer:', referrerMeta?.content || 'Not set');
  console.log('Is new referral:', isNewMeta?.content || 'Not set');
}

// Очистка для тестирования
function clearReferralData() {
  document.cookie = 'fonana_referrer=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  localStorage.removeItem('fonana_referrer');
  localStorage.removeItem('fonana_referrer_timestamp');
  localStorage.removeItem('fonana_shown_referral_notifications');
  console.log('Referral data cleared');
}
```

## Мониторинг

После деплоя следите за:
1. Отсутствием жалоб на случайные Welcome окна
2. Корректной установкой реферальных cookies
3. Правильным начислением реферальных комиссий

## Откат

Если что-то пойдет не так:
```bash
git revert HEAD
npm run build
pm2 restart fonana
``` 