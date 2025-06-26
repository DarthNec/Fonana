# Инструкции по деплою исправлений реферальной системы

## Дата: 27 января 2025

## Что было исправлено:
1. ❌ Постоянное появление Welcome окна в рандомные моменты → ✅ Показывается только при новой установке реферера
2. ❌ Неправильные значения (feed, 404) → ✅ Улучшена валидация путей и username
3. ❌ Спам уведомлениями → ✅ Уведомление показывается только один раз

## Тестирование локально (перед деплоем):

### 1. Очистите все данные в браузере:
```javascript
// Выполните в консоли браузера на localhost:3000
document.cookie = 'fonana_referrer=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
localStorage.clear();
location.reload();
```

### 2. Тест новой реферальной ссылки:
- Перейдите на `localhost:3000/testuser` (где testuser - любой валидный username)
- Должно появиться Welcome окно ОДИН раз
- Обновите страницу - окно НЕ должно появляться снова
- Проверьте cookie: `document.cookie` должна содержать `fonana_referrer=testuser`

### 3. Тест системных путей:
- Перейдите на `/feed`, `/404`, `/error` - НЕ должно устанавливать cookie
- Перейдите на `/123`, `/3user` - НЕ должно устанавливать cookie (невалидный формат)

### 4. Диагностика в консоли:
```javascript
// Проверка состояния
function checkReferralState() {
  console.log('Cookie:', document.cookie.match(/fonana_referrer=([^;]+)/)?.[1] || 'Not set');
  console.log('LocalStorage:', localStorage.getItem('fonana_referrer'));
  console.log('Shown notifications:', localStorage.getItem('fonana_shown_referral_notifications'));
  console.log('Meta referrer:', document.querySelector('meta[name="x-fonana-referrer"]')?.content);
  console.log('Is new:', document.querySelector('meta[name="x-is-new-referral"]')?.content);
}
checkReferralState();
```

## Деплой на продакшн:

### 1. Проверка перед деплоем:
```bash
# Проверить статус
./scripts/devops-status.sh

# Или быстрая проверка
ssh -p 43988 root@69.10.59.234 "pm2 status"
```

### 2. Деплой:
```bash
./deploy-to-production.sh
```

### 3. Если деплой прервется, завершите вручную:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && git pull && npm run build && pm2 restart fonana"
```

### 4. Диагностика после деплоя:
```bash
# Проверить реферальную систему
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/diagnose-referral-system.js"

# Проверить логи на ошибки
ssh -p 43988 root@69.10.59.234 "tail -n 50 /root/.pm2/logs/fonana-error.log > /tmp/errors.txt && cat /tmp/errors.txt"
```

## Тестирование на продакшне:

### 1. Тест с чистого браузера:
- Откройте инкогнито/приватное окно
- Перейдите на `https://fonana.me/fonanadev` (или другой существующий username)
- Должно появиться Welcome окно
- Обновите страницу - окно НЕ должно появляться

### 2. Тест невалидных путей:
- `https://fonana.me/feed` - НЕ должно показывать Welcome
- `https://fonana.me/404` - НЕ должно показывать Welcome
- `https://fonana.me/error` - НЕ должно показывать Welcome

### 3. Проверка в консоли браузера:
```javascript
// На fonana.me
checkReferralState(); // используйте функцию из локального теста
```

## Мониторинг после деплоя:

### 1. Следите за логами первые 30 минут:
```bash
# Скачать последние логи
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --lines 100 --nostream > /tmp/logs.txt && cat /tmp/logs.txt"
```

### 2. Проверьте что пользователи больше не жалуются на:
- Случайные Welcome окна
- Неправильные значения реферера (feed, 404)
- Постоянное появление уведомлений

### 3. Проверьте статистику:
```bash
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node scripts/health-check.js"
```

## Откат (если что-то пошло не так):

```bash
# Откатить последний коммит
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && git reset --hard HEAD~1"

# Пересобрать
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && npm run build"

# Перезапустить
ssh -p 43988 root@69.10.59.234 "pm2 restart fonana"
```

## Полезные команды:

```bash
# Найти пользователей с подозрительными никнеймами
ssh -p 43988 root@69.10.59.234 "cd /var/www/fonana && node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({
    where: {
      nickname: { in: ['404', '500', 'feed', 'error', 'null', 'undefined'] }
    }
  });
  console.log('Suspicious nicknames:', users.map(u => u.nickname));
  await prisma.\$disconnect();
})();
\""
```

## ✅ Чек-лист после деплоя:

- [ ] Сайт доступен и работает
- [ ] Welcome окно появляется только при первом визите по реферальной ссылке
- [ ] Системные пути не устанавливают реферальные cookies
- [ ] Нет ошибок в логах связанных с middleware или ReferralNotification
- [ ] Реферальные ссылки корректно устанавливают cookies
- [ ] Пользователи не жалуются на случайные Welcome окна

---
**Важно**: После успешного деплоя и тестирования обязательно сделайте git push для сохранения изменений в репозитории! 