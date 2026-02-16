# ⚡ Telegram Auth - Quick Start

## Быстрые шаги для запуска:

### 1. Получи bot username от @BotFather
Твой bot token: `8358443617:AAHivwtxP-Jz_oA9QQqwkrGS-efzrQpGaAU`

Нужно узнать **bot username** (типа `fonana_auth_bot`):
- Открой [@BotFather](https://t.me/botfather)
- Команда: `/mybots` → выбери своего бота → посмотри username

### 2. Обновить код
Открой `components/LogInMethodPopup.tsx`, строка ~83:
```typescript
script.setAttribute('data-telegram-login', 'ВАШ_BOT_USERNAME_СЮДА') // ← замени
```

### 3. Добавить в .env
```bash
TELEGRAM_BOT_TOKEN=8358443617:AAHivwtxP-Jz_oA9QQqwkrGS-efzrQpGaAU
```

### 4. Запустить миграцию
```bash
npx prisma migrate dev --name add_telegram_id
```

### 5. Настроить домен в @BotFather
```
/setdomain
→ выбери бота
→ введи твой домен (без https://)
```

### 6. Перезапустить
```bash
npm run dev
```

---

## Для тестирования на localhost:

1. Установи ngrok: https://ngrok.com/download
2. Запусти: `ngrok http 3000`
3. Скопируй HTTPS URL (например: `https://abc123.ngrok.io`)
4. В @BotFather: `/setdomain` → введи `abc123.ngrok.io`
5. Открой сайт через ngrok URL

---

**Полная документация:** `docs/TELEGRAM_AUTH_SETUP.md`
