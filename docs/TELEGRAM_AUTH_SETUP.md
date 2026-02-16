# 🔵 Инструкция по настройке Telegram Bot для авторизации

## ✅ Что уже сделано:

1. ✅ Добавлено поле `telegramId` в Prisma schema (`prisma/schema.prisma`)
2. ✅ Создан API endpoint `/api/auth/telegram/route.ts`
3. ✅ Обновлен компонент `LogInMethodPopup.tsx` с Telegram Widget
4. ✅ Обновлен `LeftSidebar.tsx` для работы с новым попапом
5. ✅ Добавлен `TELEGRAM_BOT_TOKEN` в `env.example`
6. ✅ Создана SQL миграция (`prisma/migrations/manual_add_telegram_id.sql`)

---

## 📋 Что нужно сделать:

### 1️⃣ Создать Telegram Bot

1. Открой [@BotFather](https://t.me/botfather) в Telegram
2. Отправь команду: `/newbot`
3. Введи имя бота: `Fonana Auth Bot` (или любое другое)
4. Введи username бота: **должен заканчиваться на `_bot`**, например:
   - `fonana_auth_bot`
   - `fonana_login_bot`
5. **Сохрани Bot Token**, который тебе даст @BotFather

### 2️⃣ Настроить домен для бота

1. В @BotFather отправь: `/setdomain`
2. Выбери своего бота
3. Введи свой домен: `fonana.com` (или твой production домен)
   - ⚠️ **Важно:** Telegram требует HTTPS для авторизации
   - ⚠️ На localhost это работать не будет (только через ngrok/tunneling)

### 3️⃣ Обновить .env файл

Добавь в `.env` (файл gitignore, поэтому нужно вручную):

```bash
TELEGRAM_BOT_TOKEN=8358443617:AAHivwtxP-Jz_oA9QQqwkrGS-efzrQpGaAU
```

### 4️⃣ Обновить bot username в коде

Открой `components/LogInMethodPopup.tsx` и найди строку:

```typescript
script.setAttribute('data-telegram-login', 'fonana_auth_bot') // TODO: заменить на ваш bot username
```

Замени `fonana_auth_bot` на твой реальный bot username (без @).

### 5️⃣ Запустить миграцию базы данных

**Вариант A: Через Prisma (рекомендуется)**
```bash
npx prisma migrate dev --name add_telegram_id
```

**Вариант B: Вручную через psql**
```bash
psql "postgresql://fonana_user:fonana_pass@localhost:5432/fonana" -f prisma/migrations/manual_add_telegram_id.sql
```

**Вариант C: Прямой SQL запрос**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON users("telegramId");
```

### 6️⃣ Перезапустить приложение

```bash
npm run dev
```

---

## 🧪 Тестирование

### На localhost (требуется ngrok):

1. Запусти ngrok:
   ```bash
   ngrok http 3000
   ```

2. Скопируй HTTPS URL (например: `https://abc123.ngrok.io`)

3. В @BotFather:
   ```
   /setdomain
   → выбери бота
   → введи: abc123.ngrok.io (без https://)
   ```

4. Открой сайт через ngrok URL
5. Кликни "Log In" → "Войти через Telegram"

### На production:

1. Убедись, что сайт доступен по HTTPS
2. В @BotFather настрой реальный домен
3. Деплой на production
4. Тест авторизации

---

## 🔍 Проверка работы

### 1. Проверь консоль браузера:

Должны появиться логи:
```
🔵 [TELEGRAM LOGIN] Received user data: { id: 123456789, ... }
🔵 [TELEGRAM LOGIN] Authentication successful: { ... }
```

### 2. Проверь консоль backend:

```
🔵 [TELEGRAM AUTH] Received data: { id: 123456789, username: 'john_doe', ... }
🔵 [TELEGRAM AUTH] Creating new user for Telegram ID: 123456789
🔵 [TELEGRAM AUTH] User created: { id: 'cuid...', nickname: 'john_doe', ... }
🔵 [TELEGRAM AUTH] User authenticated successfully: cuid...
```

### 3. Проверь базу данных:

```sql
SELECT id, nickname, "telegramId", wallet, avatar 
FROM users 
WHERE "telegramId" IS NOT NULL;
```

Должен появиться новый пользователь с:
- `telegramId` = твой Telegram ID
- `nickname` = username из Telegram или сгенерированный
- `wallet` = `tg_{telegramId}_{timestamp}` (fake wallet)
- `avatar` = photo_url из Telegram (если есть)

---

## 🐛 Troubleshooting

### Ошибка: "Invalid signature"

**Причина:** Неверный `TELEGRAM_BOT_TOKEN` или данные были изменены.

**Решение:**
1. Проверь, что `TELEGRAM_BOT_TOKEN` в `.env` правильный
2. Перезапусти сервер после изменения `.env`
3. Попробуй авторизацию снова

---

### Ошибка: "Auth data expired"

**Причина:** Данные от Telegram старше 1 часа.

**Решение:** Просто попробуй авторизацию снова.

---

### Telegram Widget не загружается

**Причина:** Telegram блокирует HTTP или неправильный домен.

**Решение:**
1. Используй HTTPS (на production)
2. Или используй ngrok для локального тестирования
3. Проверь консоль браузера на ошибки загрузки скрипта

---

### Ошибка: "Bot domain mismatch"

**Причина:** Домен в @BotFather не совпадает с текущим доменом.

**Решение:**
1. В @BotFather: `/setdomain`
2. Укажи правильный домен (без `https://`)
3. Для ngrok: укажи поддомен ngrok (например: `abc123.ngrok.io`)

---

### Пользователь создается, но не авторизуется

**Причина:** JWT токен не сохраняется в localStorage.

**Решение:**
1. Открой DevTools → Application → Local Storage
2. Проверь наличие ключа `fonana_jwt_token`
3. Если нет - проверь консоль на ошибки JavaScript

---

## 📊 Архитектура

```
User clicks "Войти через Telegram"
            ↓
Telegram Widget загружается (iframe)
            ↓
User авторизуется в Telegram
            ↓
Telegram отправляет подписанные данные → window.onTelegramAuth(user)
            ↓
Frontend → POST /api/auth/telegram
            ↓
Backend:
  1. Проверяет подпись (crypto.createHmac)
  2. Проверяет auth_date (не старше 1 часа)
  3. Ищет user по telegramId
  4. Если нет - создает нового
  5. Генерирует JWT токен
  6. Возвращает { token, user }
            ↓
Frontend:
  1. Сохраняет token в localStorage
  2. Показывает toast уведомление
  3. Обновляет страницу (router.refresh)
```

---

## 🔐 Безопасность

- ✅ Все данные от Telegram **подписаны** через HMAC-SHA256
- ✅ Backend **проверяет подпись** перед созданием пользователя
- ✅ Auth data **имеет срок действия** (1 час)
- ✅ JWT токен **хранится в localStorage** (можно мигрировать на httpOnly cookies)
- ✅ `TELEGRAM_BOT_TOKEN` **никогда не отправляется на frontend**

---

## 📚 Полезные ссылки

- [Telegram Login Widget Docs](https://core.telegram.org/widgets/login)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Дата создания:** 2 февраля 2026  
**Статус:** ✅ Реализация завершена, требуется настройка бота
