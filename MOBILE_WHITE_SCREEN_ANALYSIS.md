# Анализ и решение проблемы белого экрана на мобильных устройствах

## 🔍 Анализ проблемы

### Симптомы
- На мобильных устройствах показывается белый экран
- Сообщение: "Application error: a client-side exception has occurred"
- На десктопе сайт работает нормально

### Найденные причины

1. **Ошибки в логах PM2**
   - `Error: ENOENT: no such file or directory, open '/var/www/fonana/.next/routes-manifest.json'`
   - `Error: ENOENT: no such file or directory, open '/var/www/fonana/.next/BUILD_ID'`
   - Эти ошибки говорят о проблемах с build файлами Next.js

2. **Неправильный режим PM2**
   - PM2 был запущен в режиме `fork` вместо `cluster`
   - Это могло вызывать проблемы с маршрутизацией

3. **Возможные причины белого экрана на мобильных**
   - Ошибки JavaScript, специфичные для мобильных браузеров
   - Проблемы с Solana wallet adapter на мобильных
   - Проблемы с SSR (Server Side Rendering)
   - Кеширование старых версий

## ✅ Примененные решения

### 1. Исправлен режим PM2
```bash
pm2 delete all
pm2 start ecosystem.config.js
```
Теперь приложение работает в режиме `cluster`

### 2. Запущен скрипт fix-white-screen.sh
- Очищен кеш Next.js
- Перезапущено приложение
- Перезагружен nginx

### 3. Созданы диагностические страницы
- `/test.html` - простая HTML страница для проверки сервера
- `/test/mobile-debug` - React страница для сбора информации об ошибках

## 🧪 Как протестировать

### 1. Базовая проверка
Откройте на мобильном: https://fonana.me/test.html
- Должны увидеть статусы тестов
- Если эта страница работает, значит сервер отвечает

### 2. React проверка  
Откройте на мобильном: https://fonana.me/test/mobile-debug
- Покажет информацию о браузере
- Поймает и покажет любые JavaScript ошибки

### 3. Основной сайт
Попробуйте открыть: https://fonana.me
- Если белый экран, откройте консоль разработчика
- На iOS: Settings → Safari → Advanced → Web Inspector
- На Android: chrome://inspect

## 🔧 Если проблема остается

### 1. Очистите кеш браузера
- iOS: Settings → Safari → Clear History and Website Data
- Android: Chrome → Settings → Privacy → Clear browsing data

### 2. Попробуйте другой браузер
- iOS: Safari, Chrome, Firefox
- Android: Chrome, Firefox, Samsung Internet

### 3. Проверьте специфичные ошибки
```bash
# Проверить логи ошибок
ssh -p 43988 root@69.10.59.234 "pm2 logs fonana --err --lines 50"

# Проверить access логи
ssh -p 43988 root@69.10.59.234 "tail -n 50 /var/log/nginx/access.log | grep mobile"
```

## 🎯 Корневая причина (предположение)

Скорее всего проблема в:
1. **Solana wallet adapter** не поддерживает некоторые мобильные браузеры
2. **Hydration mismatch** - разница между серверным и клиентским рендерингом
3. **Полифиллы** - отсутствие поддержки некоторых API в старых браузерах

## 🚀 Долгосрочное решение

1. **Добавить error boundary** для перехвата ошибок React
2. **Добавить полифиллы** для старых браузеров
3. **Lazy loading** для Solana wallet adapter
4. **PWA оптимизация** для мобильных устройств 