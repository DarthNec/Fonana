# 📦 Скрипт назначения CDN аватаров пользователям

## 🎯 Что делает скрипт?

Находит пользователей с "плохими" аватарами и назначает им уникальные аватары из CDN:

**"Плохие" аватары:**
- ❌ `null` или `undefined`
- ❌ Локальные пути `/media/avatars/...`
- ❌ DiceBear SVG `https://api.dicebear.com/7.x/avataaars/svg?seed=...`

**"Хорошие" аватары:**
- ✅ `https://fonanastorage.b-cdn.net/avatars/default/female-portrait-001.jpg`
- ✅ Уникальные (без повторов)
- ✅ Реальные фотографии женских лиц

---

## 🚀 Быстрый старт

### Шаг 1: Загрузите аватары на CDN

Сначала загрузите файлы из `public/media/faces/` на ваш CDN:

```
https://fonanastorage.b-cdn.net/avatars/default/female-portrait-001.jpg
https://fonanastorage.b-cdn.net/avatars/default/female-portrait-002.jpg
...
https://fonanastorage.b-cdn.net/avatars/default/female-portrait-250.jpg
```

### Шаг 2: Тестовый запуск (DRY RUN)

```bash
# Проверить что будет изменено БЕЗ реальных изменений
node scripts/assign-cdn-avatars.js --dry-run
```

### Шаг 3: Реальное обновление

```bash
# Обновить всех пользователей
node scripts/assign-cdn-avatars.js
```

---

## 📖 Использование

### Базовые команды

```bash
# Тестовый режим (без изменений в БД)
node scripts/assign-cdn-avatars.js --dry-run

# Реальное обновление всех пользователей
node scripts/assign-cdn-avatars.js

# Обновить только 50 пользователей (для теста)
node scripts/assign-cdn-avatars.js --limit 50

# Сбросить список использованных аватаров
node scripts/assign-cdn-avatars.js --reset-used

# Подключиться к удаленной БД
node scripts/assign-cdn-avatars.js --db-host 64.20.37.222
```

### Справка

```bash
node scripts/assign-cdn-avatars.js --help
```

---

## ⚙️ Параметры

| Параметр | Описание | Пример |
|----------|----------|--------|
| `--dry-run` | Тестовый режим (без изменений) | `--dry-run` |
| `--limit N` | Обработать только N пользователей | `--limit 100` |
| `--reset-used` | Сбросить список использованных | `--reset-used` |
| `--db-host HOST` | Хост базы данных | `--db-host localhost` |
| `--db-port PORT` | Порт базы данных | `--db-port 5432` |
| `--help, -h` | Показать справку | `--help` |

---

## 🔧 Настройка

Если нужно изменить настройки, отредактируйте `CONFIG` в начале файла:

```javascript
const CONFIG = {
  // База данных
  db: {
    host: 'localhost',      // Хост БД
    port: 5432,             // Порт БД
    database: 'fonana',     // Имя БД
    user: 'fonana_user',    // Пользователь
    password: 'fonana_pass' // Пароль
  },
  
  // CDN путь для новых аватаров
  cdnBasePath: 'https://fonanastorage.b-cdn.net/avatars/default/',
  
  // Локальная папка с аватарами
  localAvatarsDir: 'public/media/faces',
  
  // Dry run (тестовый режим)
  dryRun: false,
  
  // Лимит пользователей (0 = все)
  limit: 0
};
```

---

## 📊 Пример вывода

```
🚀 Скрипт назначения CDN аватаров

🔌 Подключение к базе данных...
✅ Подключено к БД

👥 Поиск пользователей с "плохими" аватарами...
   📊 Всего пользователей: 523
   🎯 Нужно обновить: 487
   ✅ Уже с CDN аватарами: 36

📁 Найдено аватаров в папке: 250
📋 Загружено использованных аватаров: 36

📊 Статистика аватаров:
   📁 Всего аватаров: 250
   ✅ Использовано: 36
   🆕 Доступно: 214

🔄 Начинаю обновление пользователей...

[1/487] crypto_artist_42
   ❌ Старый: null
   ✅ Новый:  https://fonanastorage.b-cdn.net/avatars/default/female-portrait-001.jpg

[2/487] digital_dreamer
   ❌ Старый: /media/avatars/avatar_123.jpg
   ✅ Новый:  https://fonanastorage.b-cdn.net/avatars/default/female-portrait-002.jpg

[3/487] pixel_queen
   ❌ Старый: https://api.dicebear.com/7.x/avataaars/svg?seed=StarFox545
   ✅ Новый:  https://fonanastorage.b-cdn.net/avatars/default/female-portrait-003.jpg

...

📈 Прогресс: 100/487 (21%)

...

============================================================
🎉 ОБНОВЛЕНИЕ ЗАВЕРШЕНО!

📊 Финальная статистика:
   ✅ Успешно обновлено: 487
   ❌ Ошибок: 0
   📁 Использовано аватаров: 250
   🆕 Осталось неиспользованных: 0

✅ Изменения применены к базе данных
============================================================

🔍 Проверка финального состояния...

📊 Статистика аватаров в БД:
   👥 Всего пользователей: 523
   🌐 CDN аватары: 523
   📂 Локальные (/media): 0
   🎨 DiceBear: 0
   ❌ Null/пустые: 0

🎯 Покрытие CDN аватарами: 100%
✅ Отлично! Почти все пользователи с CDN аватарами
```

---

## 🔄 Отслеживание использованных аватаров

Скрипт создает файл `scripts/.used-avatars.json` который хранит список уже назначенных аватаров:

```json
[
  "female-portrait-001.jpg",
  "female-portrait-002.jpg",
  "female-portrait-003.jpg",
  ...
]
```

**Зачем это нужно:**
- ✅ Избегает повторов
- ✅ Можно запускать скрипт многократно
- ✅ Новые пользователи получат неиспользованные аватары

**Сброс списка:**
```bash
# Удалить файл вручную
del scripts\.used-avatars.json

# Или через скрипт
node scripts/assign-cdn-avatars.js --reset-used
```

---

## ⚠️ Важные моменты

### 1. Backup базы данных

Перед массовым обновлением сделайте backup:

```bash
pg_dump -U fonana_user -h localhost fonana > backup_before_avatars.sql
```

### 2. Проверка CDN

Убедитесь что аватары доступны на CDN:

```bash
# Проверить несколько файлов
curl -I https://fonanastorage.b-cdn.net/avatars/default/female-portrait-001.jpg
curl -I https://fonanastorage.b-cdn.net/avatars/default/female-portrait-050.jpg
curl -I https://fonanastorage.b-cdn.net/avatars/default/female-portrait-100.jpg
```

Должны вернуть `200 OK`.

### 3. Используйте --dry-run сначала

Всегда начинайте с тестового режима:

```bash
node scripts/assign-cdn-avatars.js --dry-run
```

Проверьте вывод, и только потом запускайте реальное обновление.

### 4. Если аватаров не хватает

```
⚠️  ВНИМАНИЕ: Пользователей (500) больше чем аватаров (250)
💡 Некоторые аватары будут переиспользованы
```

**Решение:**
```bash
# Загрузить больше аватаров
node scripts/download-female-avatars.js --count 500
```

---

## 🐛 Устранение неполадок

### Ошибка: База данных не доступна

```
❌ КРИТИЧЕСКАЯ ОШИБКА: connect ECONNREFUSED 127.0.0.1:5432
```

**Решение:**
- Проверьте что PostgreSQL запущен
- Проверьте host/port/database в CONFIG
- Используйте `--db-host` для удаленной БД

### Ошибка: Папка с аватарами не найдена

```
❌ Папка не найдена: public/media/faces
💡 Сначала запустите: node scripts/download-female-avatars.js
```

**Решение:**
```bash
# Загрузить аватары
node scripts/download-female-avatars.js
```

### Ошибка: Аватары не доступны на CDN

После обновления пользователи видят битые изображения.

**Решение:**
1. Проверьте что файлы загружены на CDN
2. Проверьте права доступа (public)
3. Проверьте CORS настройки CDN
4. Используйте curl для проверки доступности

### Все аватары уже использованы

```
⚠️  ВНИМАНИЕ: Все аватары уже использованы!
🔄 Использую все аватары заново...
```

**Это нормально** - скрипт начнет использовать аватары повторно.

**Если нужны уникальные:**
```bash
# Загрузить больше
node scripts/download-female-avatars.js --count 500

# Запустить обновление снова
node scripts/assign-cdn-avatars.js
```

---

## 📝 Примеры использования

### Сценарий 1: Первое массовое обновление

```bash
# 1. Тестовый прогон
node scripts/assign-cdn-avatars.js --dry-run

# 2. Реальное обновление
node scripts/assign-cdn-avatars.js

# 3. Проверка результатов в БД
psql -U fonana_user -d fonana -c "SELECT COUNT(*), avatar FROM users GROUP BY avatar;"
```

### Сценарий 2: Обновление новых пользователей

```bash
# Запускать периодически (например, раз в день)
node scripts/assign-cdn-avatars.js

# Скрипт автоматически найдет пользователей без CDN аватаров
# и назначит им неиспользованные изображения
```

### Сценарий 3: Сброс и начало заново

```bash
# 1. Сбросить список использованных
node scripts/assign-cdn-avatars.js --reset-used

# 2. Обновить всех заново
node scripts/assign-cdn-avatars.js
```

---

## 🔐 Безопасность

**НЕ коммитьте:**
- `scripts/.used-avatars.json` (добавлен в .gitignore)
- Пароли БД (используйте environment variables)

**Для продакшена:**
```bash
# Используйте переменные окружения
export DB_HOST=your-db-host
export DB_PASSWORD=your-password
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте README
2. Запустите с `--help`
3. Проверьте логи ошибок
4. Используйте `--dry-run` для диагностики

---

**Создано:** 18.02.2026  
**Автор:** M7 Analysis System  
**Версия:** 1.0  
**Совместимость:** Node.js 14+, PostgreSQL 12+
