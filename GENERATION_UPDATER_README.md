# Generation Updater - Автоматическое обновление доступных генераций

## 📋 Описание

Скрипт `updateUserGeneration.js` автоматически обновляет счетчик доступных генераций для пользователей. Каждый день в 4:00 утра скрипт проверяет всех пользователей с `availableGenerationCount < 3` и восстанавливает им доступные генерации до значения `3`.

## ⚙️ Конфигурация

Скрипт добавлен в PM2 конфигурацию (`ecosystem.config.js`) со следующими параметрами:

```javascript
{
  name: 'generation-updater',
  script: './updateUserGeneration.js',
  cron_restart: '0 4 * * *', // Каждый день в 4:00 утра
  autorestart: false,        // Только по крону, без автоперезапуска
  env: {
    NODE_ENV: 'production'
  }
}
```

## 🚀 Управление скриптом

### Запустить скрипт вручную (для тестирования)
```bash
node updateUserGeneration.js
```

### Запустить через PM2
```bash
pm2 start ecosystem.config.js --only generation-updater
```

### Остановить
```bash
pm2 stop generation-updater
```

### Перезапустить
```bash
pm2 restart generation-updater
```

### Посмотреть логи
```bash
pm2 logs generation-updater
```

### Или прямой доступ к файлам логов
```bash
# Обычные логи
tail -f /var/www/Fonana/logs/generation-updater-out.log

# Логи ошибок
tail -f /var/www/Fonana/logs/generation-updater-error.log
```

## 📊 Что делает скрипт

1. **Находит пользователей** с `availableGenerationCount < 3`
2. **Логирует информацию** о пользователях, которые будут обновлены
3. **Обновляет счетчик** до значения `3` для всех найденных пользователей
4. **Выводит отчет** о количестве обновленных пользователей

## 📝 Пример вывода

```
[GenerationUpdater] ==========================================
[GenerationUpdater] Starting daily generation update...
[GenerationUpdater] Timestamp: 2025-10-31T04:00:00.000Z
[GenerationUpdater] ==========================================

[GenerationUpdater] Fetching users with low generation count...
[GenerationUpdater] Found 15 users with availableGenerationCount < 3

[GenerationUpdater] Users to update:
  - alice_123 (ID: clx123abc) | Current: 0 → New: 3
  - bob_456 (ID: clx456def) | Current: 1 → New: 3
  - carol_789 (ID: clx789ghi) | Current: 2 → New: 3
  ...

[GenerationUpdater] Updating user generations to 3...
[GenerationUpdater] ✅ Successfully updated 15 users

[GenerationUpdater] ==========================================
[GenerationUpdater] Update complete!
[GenerationUpdater] Total users updated: 15
[GenerationUpdater] ==========================================
```

## 🔧 Настройка расписания

Если нужно изменить время запуска, отредактируйте `cron_restart` в `ecosystem.config.js`:

```javascript
cron_restart: '0 4 * * *'  // Каждый день в 4:00 утра
```

Примеры других расписаний:
- `'0 0 * * *'` - Каждый день в полночь
- `'0 12 * * *'` - Каждый день в полдень
- `'0 4 * * 1'` - Каждый понедельник в 4:00
- `'0 0 1 * *'` - 1-го числа каждого месяца в полночь

После изменения конфигурации:
```bash
pm2 reload ecosystem.config.js
```

## 🛠️ Технические детали

- **База данных:** PostgreSQL через Prisma ORM
- **Модель:** `User.availableGenerationCount`
- **Условие обновления:** `availableGenerationCount < 3`
- **Новое значение:** `3`
- **Менеджер процессов:** PM2 с cron-планировщиком

## ⚠️ Важно

- Скрипт **не перезапускается автоматически** при ошибках (autorestart: false)
- Запускается **только по расписанию** через PM2 cron
- При необходимости **можно запустить вручную** для немедленного обновления
- Все действия **логируются** в отдельные файлы

## 📦 Зависимости

- `@prisma/client` - для работы с базой данных
- Node.js 18+
- PM2 (для автоматического запуска по расписанию)

