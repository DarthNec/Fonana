# 🎰 Wheel Spins Reset Script

## Назначение
Ежедневно начисляет **1 бесплатное вращение** колеса лотереи всем пользователям, у которых закончились вращения (0).

## Логика работы

### 1. **Поиск пользователей**
```sql
SELECT * FROM users WHERE availableWheelSpins = 0
```
Находит всех пользователей с `availableWheelSpins = 0`.

### 2. **Обновление вращений**
```sql
UPDATE users 
SET availableWheelSpins = 1 
WHERE availableWheelSpins = 0
```
Устанавливает `availableWheelSpins = 1` для найденных пользователей.

### 3. **Статистика**
Выводит:
- Общее количество пользователей
- Пользователей с активными вращениями
- Количество обновлённых пользователей

## PM2 Конфигурация

```javascript
{
  name: 'wheel-spins-reset',
  script: './resetWheelSpins.js',
  cron_restart: '0 0 * * *', // Каждый день в 00:00 (полночь)
  autorestart: false
}
```

### Расписание
- **Время**: Каждый день в **00:00** (полночь)
- **Частота**: 1 раз в сутки
- **Автоперезапуск**: Отключён (только по крону)

## Запуск

### Вручную (тестирование)
```bash
# Локально
node resetWheelSpins.js

# На сервере
cd /var/www/Fonana
node resetWheelSpins.js
```

### Через PM2
```bash
# Добавить в PM2
pm2 start ecosystem.config.js --only wheel-spins-reset

# Просмотр логов
pm2 logs wheel-spins-reset

# Статус
pm2 status wheel-spins-reset

# Остановить
pm2 stop wheel-spins-reset

# Удалить
pm2 delete wheel-spins-reset
```

## Логи

### Успешное выполнение
```
🎰 [Wheel Spins Reset] Starting daily wheel spins reset...
🕐 [Wheel Spins Reset] Execution time: 2026-02-26T00:00:00.000Z
🔍 [Wheel Spins Reset] Finding users with 0 wheel spins...
📊 [Wheel Spins Reset] Found 1247 users with 0 spins
🔄 [Wheel Spins Reset] Updating wheel spins to 1...
✅ [Wheel Spins Reset] Successfully updated 1247 users

📊 [Wheel Spins Reset] Statistics:
   - Total users: 5000
   - Users with spins: 5000
   - Users updated: 1247
   - Completion time: 2026-02-26T00:00:05.123Z

✅ [Wheel Spins Reset] Script completed successfully!
```

### Нет пользователей для обновления
```
🎰 [Wheel Spins Reset] Starting daily wheel spins reset...
🔍 [Wheel Spins Reset] Finding users with 0 wheel spins...
📊 [Wheel Spins Reset] Found 0 users with 0 spins
✅ [Wheel Spins Reset] No users to update. All users already have spins.
```

### Файлы логов
- **Успешные операции**: `/var/www/Fonana/logs/wheel-spins-reset-out.log`
- **Ошибки**: `/var/www/Fonana/logs/wheel-spins-reset-error.log`

## Безопасность

### ✅ Безопасные операции
- Использует `updateMany` (bulk update) - эффективно для больших объёмов
- Не затрагивает пользователей с активными вращениями
- Автоматическое закрытие соединения с БД
- Graceful exit с корректными кодами (`0` = успех, `1` = ошибка)

### ⚠️ Ограничения
- **Только INCREMENT до 1**: Скрипт НЕ добавляет вращения, если у пользователя уже есть (1+)
- **Не накапливаются**: Если пользователь не использовал вращение вчера, оно не переносится на сегодня
- **Одно вращение в сутки**: Максимум 1 бесплатное вращение в день

## Интеграция с Lottery

### Как это работает с системой лотереи
1. **00:00** - Скрипт начисляет 1 вращение всем с 0 вращений
2. **В течение дня** - Пользователи тратят вращения на колесе (`POST /api/wheel`)
3. **Следующий день** - Скрипт снова начисляет вращения тем, кто потратил своё

### Связанные файлы
- **Frontend**: `components/LotteryPage.tsx`
- **API GET**: `app/api/wheel/route.ts` (проверка доступных вращений)
- **API POST**: `app/api/wheel/route.ts` (трата вращения)
- **API Reward**: `app/api/wheel/reward/route.ts` (начисление призов)
- **Database**: `schema.prisma` → `User.availableWheelSpins`

## Мониторинг

### Проверка работы
```bash
# Проверить последний запуск
pm2 logs wheel-spins-reset --lines 50

# Проверить статистику в БД
psql "postgresql://fonana_user:fonana_pass@localhost:5432/fonana" \
  -c "SELECT COUNT(*) as total, 
      COUNT(CASE WHEN \"availableWheelSpins\" > 0 THEN 1 END) as with_spins 
      FROM users;"
```

### Ожидаемое поведение
- **Первый запуск**: Обновит всех пользователей с 0 вращений
- **Повторный запуск в тот же день**: 0 пользователей (уже обновлены)
- **Ежедневный запуск**: Количество обновлённых ≈ количество активных пользователей

## Troubleshooting

### Проблема: Скрипт не запускается
**Решение**: Проверить PM2 cron
```bash
pm2 describe wheel-spins-reset | grep cron
```

### Проблема: Все пользователи с 0 вращений
**Решение**: Проверить, запущен ли процесс
```bash
pm2 status wheel-spins-reset
```

### Проблема: Ошибка Prisma
**Решение**: Проверить подключение к БД
```bash
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => console.log('Users:', c)).finally(() => p.\$disconnect())"
```

## История изменений

### v1.0 (2026-02-26)
- ✅ Создан скрипт `resetWheelSpins.js`
- ✅ Добавлена конфигурация в `ecosystem.config.js`
- ✅ Настроен cron на 00:00 ежедневно
- ✅ Добавлены логи и статистика
- ✅ Документация
