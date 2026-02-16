# 🐱 AI Sora Generation Activity Bot

**Дата создания:** 4 февраля 2026  
**Автор:** Fonana Dev Team  
**Статус:** ✅ Ready for Production

---

## 📋 ОПИСАНИЕ

Автоматический бот для создания Sora-2 генераций про смешных котиков. Работает как автономный PM2 процесс, запускается каждые 4 часа.

---

## 🎯 ФУНКЦИОНАЛ

### 1. Выбор AI Пользователя
- Загружает список AI пользователей из `ai-chat-users.json`
- Выбирает случайного пользователя для публикации

### 2. Генерация Промпта
- Использует OpenAI GPT-3.5-turbo для создания креативных промптов
- Тема: Смешные и милые котики
- Стиль: Простые, понятные, вирусные сценарии
- Fallback: 10 предустановленных промптов на случай ошибки API

### 3. Создание Sora-2 Генерации
- Отправляет запрос к OpenAI Sora-2 API
- Параметры:
  - **Model:** `sora-2`
  - **Duration:** 8 или 12 секунд (случайный выбор)
  - **Size:** `1080x1920` (вертикальный формат)
  - **Prompt:** Сгенерированный текст про котиков

### 4. Создание Поста в БД
- Создаёт пост типа `ai-video`
- Категория: `funny`
- Теги: `['cat', 'funny', 'ai-generated']`
- Статус: `processing` (до завершения генерации)
- Access: `free` (публичный пост)

---

## 📊 АРХИТЕКТУРА

```
┌─────────────────────────────────────────┐
│      ai-sora-generation-activity.js     │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│   1. Load AI Users (ai-chat-users.json) │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│   2. Generate Cat Prompt (OpenAI GPT)   │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│   3. Create Sora-2 Generation (OpenAI)  │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│   4. Create Post in DB (Prisma)         │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│   5. Sora Checker (sorachecker.js)      │
│      Проверяет статус каждую минуту     │
└─────────────────────────────────────────┘
```

---

## ⚙️ КОНФИГУРАЦИЯ PM2

**Файл:** `ecosystem.config.js`

```javascript
{
  name: 'ai-sora-generation-activity',
  script: './ai-sora-generation-activity.js',
  instances: 1,
  exec_mode: 'fork',
  cron_restart: '0 */4 * * *', // Каждые 4 часа
  autorestart: false,
  watch: false,
  max_memory_restart: '300M',
  env_file: './.env',
  env: {
    NODE_ENV: 'production'
  },
  error_file: '/var/www/Fonana/logs/ai-sora-generation-error.log',
  out_file: '/var/www/Fonana/logs/ai-sora-generation-out.log',
  time: true,
  merge_logs: true
}
```

### Расписание Запуска:
- **00:00** (полночь)
- **04:00** (утро)
- **08:00** (утро)
- **12:00** (день)
- **16:00** (день)
- **20:00** (вечер)

**Итого:** 6 генераций в день = ~180 генераций в месяц

---

## 🧠 ГЕНЕРАЦИЯ ПРОМПТОВ

### OpenAI Prompt Template:
```
Ты креативный сценарист для коротких вирусных видео.
Придумай КОРОТКИЙ промпт (1-2 предложения) для Sora-2 генерации видео про смешного котика.

ТРЕБОВАНИЯ:
- Котик должен делать что-то СМЕШНОЕ и МИЛОЕ
- Можно несколько котиков, если это смешнее
- Описание должно быть простым и понятным
- Без сложных эффектов, фокус на котике и его действиях
- Стиль: уютный, домашний, реалистичный
- Длина: максимум 2 предложения
```

### Примеры Сгенерированных Промптов:
1. `"Orange tabby cat trying to fit into a tiny cardboard box, wiggling and pushing with paws, home setting"`
2. `"Two playful kittens chasing a laser pointer dot across a living room carpet, tumbling over each other"`
3. `"Fluffy white cat wearing tiny sunglasses, sitting on a windowsill like a boss, urban background"`
4. `"Grey cat dramatically falling off a couch in slow motion, surprised expression, cozy home"`
5. `"Black cat sneaking up on a cucumber placed behind it, jumping high in the air when noticing it"`

### Fallback Промпты:
Если OpenAI недоступен, используются 10 предустановленных промптов:
- Orange tabby cat in tiny box
- Kittens chasing laser pointer
- Cat with sunglasses
- Cat falling off couch
- Cat catching tail
- Cat vs cucumber
- Cat in round shape
- Cats mission impossible
- Persian cat grooming
- Cat playing piano

---

## 📝 СОЗДАНИЕ ПОСТА

### Структура Post в БД:
```typescript
{
  creatorId: string,           // ID AI пользователя
  title: string,               // Промпт Sora-2
  content: '',                 // Пустой для ai-video
  type: 'ai-video',            // Тип поста
  category: 'funny',           // Категория
  tags: ['cat', 'funny', 'ai-generated'],
  thumbnail: '/placeholder-video-enhanced.png',
  mediaUrl: null,              // Будет заполнен после генерации
  previewUrl: null,
  blurUrl: null,
  requestId: string,           // ID Sora-2 генерации
  requestStatus: 'processing', // Статус
  isLocked: false,
  isPremium: false,
  accessType: 'free',
  price: null,
  currency: null,
  minSubscriptionTier: null,
  isSellable: false,
  sellType: null,
  viewsCount: 0,
  commentsCount: 0,
  likesCount: 0
}
```

---

## 🔄 ЖИЗНЕННЫЙ ЦИКЛ ГЕНЕРАЦИИ

### 1. Создание (ai-sora-generation-activity.js)
```
[04:00] Bot starts
  ↓
Select random AI user
  ↓
Generate cat prompt via OpenAI
  ↓
Create Sora-2 generation (8 or 12 sec)
  ↓
Create post in DB (status: processing)
  ↓
Bot exits
```

### 2. Мониторинг (sorachecker.js - каждую минуту)
```
Find posts with requestStatus: 'processing'
  ↓
Check Sora-2 API for video status
  ↓
If completed:
  - Download video
  - Upload to Bunny CDN
  - Update post (mediaUrl, status: 'completed')
  ↓
If failed:
  - Update post (status: 'failed')
```

### 3. Публикация
```
Post visible in feed with mediaUrl
  ↓
Users can view, like, comment
  ↓
Standard post lifecycle
```

---

## 🚀 ЗАПУСК И УПРАВЛЕНИЕ

### Первый запуск:
```bash
cd /var/www/Fonana
pm2 start ecosystem.config.js --only ai-sora-generation-activity
```

### Проверка статуса:
```bash
pm2 list
# Смотрим на ai-sora-generation-activity

pm2 info ai-sora-generation-activity
# Детальная информация
```

### Просмотр логов:
```bash
# Все логи
pm2 logs ai-sora-generation-activity

# Только ошибки
pm2 logs ai-sora-generation-activity --err

# Только output
pm2 logs ai-sora-generation-activity --out

# Реальные файлы логов
tail -f /var/www/Fonana/logs/ai-sora-generation-out.log
tail -f /var/www/Fonana/logs/ai-sora-generation-error.log
```

### Ручной запуск (тестирование):
```bash
node ai-sora-generation-activity.js
```

### Остановка:
```bash
pm2 stop ai-sora-generation-activity
```

### Перезапуск:
```bash
pm2 restart ai-sora-generation-activity
```

### Удаление из PM2:
```bash
pm2 delete ai-sora-generation-activity
```

---

## 📊 МОНИТОРИНГ

### Ключевые Метрики:
1. **Успешные генерации:** Посты со статусом `completed`
2. **Провальные генерации:** Посты со статусом `failed`
3. **В процессе:** Посты со статусом `processing`
4. **Среднее время генерации:** От создания до `completed`

### SQL Запросы для Мониторинга:
```sql
-- Все AI-video посты с котиками
SELECT * FROM "Post" 
WHERE type = 'ai-video' 
AND tags::text LIKE '%cat%'
ORDER BY "createdAt" DESC;

-- Статистика по статусам
SELECT "requestStatus", COUNT(*) 
FROM "Post" 
WHERE type = 'ai-video' 
AND tags::text LIKE '%cat%'
GROUP BY "requestStatus";

-- Последние 10 генераций
SELECT id, title, "requestStatus", "createdAt"
FROM "Post" 
WHERE type = 'ai-video' 
AND tags::text LIKE '%cat%'
ORDER BY "createdAt" DESC 
LIMIT 10;
```

---

## ⚠️ TROUBLESHOOTING

### Проблема 1: OpenAI API Ошибка
**Симптом:** `[AI Sora Bot] ⚠️ OpenAI error, using fallback`

**Причины:**
- API key невалиден
- Превышен rate limit
- Нет средств на счету

**Решение:**
- Проверьте `NEXT_PUBLIC_OPENAI_API_KEY` в `.env`
- Fallback промпты будут использованы автоматически

---

### Проблема 2: Sora-2 API Ошибка
**Симптом:** `[AI Sora Bot] ❌ Sora-2 generation error`

**Причины:**
- API key невалиден
- Превышен лимит генераций
- Проблемы с OpenAI API

**Решение:**
- Проверьте логи: `tail -f /var/www/Fonana/logs/ai-sora-generation-error.log`
- Проверьте статус OpenAI: https://status.openai.com
- Проверьте баланс: https://platform.openai.com/usage

---

### Проблема 3: Файл ai-chat-users.json не найден
**Симптом:** `[AI Sora Bot] ❌ AI users file not found!`

**Решение:**
```bash
# Проверьте наличие файла
ls -la /var/www/Fonana/ai-chat-users.json

# Если нет, создайте (используйте существующих AI пользователей)
cat > ai-chat-users.json << 'EOF'
[
  {
    "id": "user_id_1",
    "nickname": "ai_bot_1",
    "wallet": "wallet_address_1"
  }
]
EOF
```

---

### Проблема 4: Prisma Connection Error
**Симптом:** `Error connecting to database`

**Решение:**
- Проверьте `DATABASE_URL` в `.env`
- Проверьте PostgreSQL: `systemctl status postgresql`
- Рестарт: `pm2 restart ai-sora-generation-activity`

---

## 💡 BEST PRACTICES

### 1. Мониторинг
- Проверяйте логи ежедневно
- Следите за статистикой генераций
- Настройте алерты для ошибок

### 2. Оптимизация
- Регулярно обновляйте fallback промпты
- Анализируйте популярные генерации
- Адаптируйте промпты под аудиторию

### 3. Расходы
- Отслеживайте расходы на OpenAI API
- Sora-2 генерация: ~$0.20 за видео
- 6 генераций/день = ~$1.20/день = ~$36/месяц

### 4. Контент
- Регулярно проверяйте качество генераций
- Удаляйте неудачные генерации
- Собирайте фидбек от пользователей

---

## 📈 МЕТРИКИ УСПЕХА

### KPI:
- **Успешность генераций:** > 90%
- **Среднее время:** < 5 минут
- **Engagement:** Лайки, комментарии, просмотры
- **Вирусность:** Репосты, шеринг

### Целевые Показатели:
- 6 генераций/день
- 180 генераций/месяц
- 80%+ успешных генераций
- 1000+ просмотров на пост

---

## 🔐 БЕЗОПАСНОСТЬ

### API Keys:
- Хранятся в `.env`
- Не коммитятся в Git
- Доступ только для PM2 процессов

### Логи:
- Токены маскируются
- Sensitive data не логируется
- Регулярная ротация логов

---

## 📚 СВЯЗАННЫЕ ФАЙЛЫ

| Файл | Описание |
|------|----------|
| `ai-sora-generation-activity.js` | Основной скрипт бота |
| `ecosystem.config.js` | PM2 конфигурация |
| `sorachecker.js` | Проверка статуса генераций |
| `ai-chat-users.json` | Список AI пользователей |
| `app/api/sora/mobile/route.ts` | Sora-2 API endpoint |

---

## ✅ ИТОГ

**Бот готов к production!**

- ✅ Скрипт создан
- ✅ PM2 конфигурация добавлена
- ✅ Логирование настроено
- ✅ Документация готова
- ✅ Мониторинг описан

**Запуск:** `pm2 start ecosystem.config.js --only ai-sora-generation-activity`

---

**Автор:** Fonana Dev Team  
**Дата:** 4 февраля 2026  
**Версия:** 1.0
