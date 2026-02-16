# 🔵 Telegram Authentication Implementation Plan

**Дата:** 2 февраля 2026  
**Цель:** Реализовать авторизацию через Telegram для пользователей без криптокошелька

---

## 📋 Содержание

1. [Требования](#требования)
2. [Варианты решения](#варианты-решения)
3. [Детальный анализ](#детальный-анализ)
4. [Рекомендация](#рекомендация)
5. [Пошаговая реализация](#пошаговая-реализация)
6. [Архитектура](#архитектура)

---

## 🎯 Требования

### Что нужно получить от Telegram:
- ✅ **Telegram User ID** (уникальный идентификатор)
- ✅ **Username** (опционально, для отображения)
- ✅ **First Name / Last Name** (для генерации никнейма)
- ✅ **Photo URL** (для аватара, опционально)

### Что мы делаем на backend:
- ✅ Создаем нового пользователя в БД с `telegramId`
- ✅ Генерируем уникальный `nickname` (как с кошельком)
- ✅ Связываем сессию с пользователем
- ✅ Возвращаем JWT токен для авторизации

---

## 🔄 Варианты решения

### **Вариант 1: Telegram Login Widget (Official)** 🥇 РЕКОМЕНДУЕТСЯ

**Описание:**  
Официальный виджет от Telegram для веб-авторизации. Самый простой и надежный способ.

**Как работает:**
1. Пользователь кликает на кнопку "Login with Telegram"
2. Открывается Telegram Web или приложение
3. Пользователь подтверждает вход
4. Telegram возвращает подписанные данные на callback URL
5. Backend проверяет подпись и создает пользователя

**Что нужно:**
- 🤖 Telegram Bot (создать через [@BotFather](https://t.me/botfather))
- 🔑 Bot Token
- 🌐 Domain (для callback URL)
- 📦 NPM пакет: `@telegram-auth/server` или проверка вручную

**Плюсы:**
- ✅ Официальное решение от Telegram
- ✅ Безопасно (данные подписаны bot token)
- ✅ Не требует сложной инфраструктуры
- ✅ Работает на всех платформах (web, mobile web)
- ✅ Простая интеграция (1-2 часа)

**Минусы:**
- ⚠️ Требует наличие домена (не работает на localhost без туннеля)
- ⚠️ Пользователь должен иметь Telegram аккаунт

**Безопасность:** ⭐⭐⭐⭐⭐  
**Сложность:** ⭐⭐ (Easy)  
**Время реализации:** 1-2 часа

---

### **Вариант 2: Telegram WebApp (Mini App)** 🚀

**Описание:**  
Использование Telegram WebApp API для получения данных пользователя без редиректа.

**Как работает:**
1. Пользователь открывает ваш сайт внутри Telegram WebApp
2. JavaScript получает `window.Telegram.WebApp.initDataUnsafe`
3. Данные отправляются на backend
4. Backend проверяет подпись через bot token

**Что нужно:**
- 🤖 Telegram Bot
- 🔑 Bot Token
- 📦 NPM пакет: `@twa-dev/sdk` (frontend)
- 🌐 Ваш сайт должен быть доступен как WebApp через бота

**Плюсы:**
- ✅ Бесшовный UX (нет редиректов)
- ✅ Автоматическая авторизация при открытии через Telegram
- ✅ Доступ к дополнительным API Telegram (payments, notifications)
- ✅ Работает на мобильных устройствах идеально

**Минусы:**
- ⚠️ Работает ТОЛЬКО внутри Telegram приложения
- ⚠️ Если пользователь открывает сайт в браузере - не работает
- ⚠️ Требует настройки бота как WebApp

**Безопасность:** ⭐⭐⭐⭐⭐  
**Сложность:** ⭐⭐⭐ (Medium)  
**Время реализации:** 3-4 часа

---

### **Вариант 3: Telegram Bot + Deep Links** 🔗

**Описание:**  
Пользователь получает одноразовую ссылку, кликает по ней в Telegram, бот отправляет код на сайт.

**Как работает:**
1. Frontend генерирует уникальный `sessionId`
2. Показываем кнопку "Открыть Telegram" с deep link: `https://t.me/YourBot?start={sessionId}`
3. Пользователь кликает, открывается бот
4. Бот отправляет user ID на backend с `sessionId`
5. Frontend делает polling для проверки авторизации

**Что нужно:**
- 🤖 Telegram Bot
- 🔑 Bot Token
- 📦 Library: `node-telegram-bot-api` или `telegraf`
- 🗄️ Redis/DB для хранения временных session

**Плюсы:**
- ✅ Работает даже если сайт открыт в обычном браузере
- ✅ Можно использовать на localhost (через ngrok для бота)
- ✅ Гибкость в UX

**Минусы:**
- ⚠️ Сложнее в реализации (нужен polling или WebSocket)
- ⚠️ Требует запуска bot сервера
- ⚠️ Нужен Redis для хранения временных сессий
- ⚠️ Пользователь должен вручную переключаться между сайтом и Telegram

**Безопасность:** ⭐⭐⭐⭐  
**Сложность:** ⭐⭐⭐⭐ (Hard)  
**Время реализации:** 6-8 часов

---

### **Вариант 4: OAuth через Telegram** ❌ НЕ РЕКОМЕНДУЕТСЯ

**Описание:**  
Telegram не предоставляет стандартный OAuth2 flow (как Google/Facebook).

**Статус:** ❌ Не поддерживается нативно  
**Альтернатива:** Использовать Вариант 1 (Login Widget)

---

## 🎯 Рекомендация: **Вариант 1 - Telegram Login Widget**

### Почему именно он?

1. ✅ **Официальный и надежный** - поддерживается Telegram
2. ✅ **Простая реализация** - меньше кода, меньше багов
3. ✅ **Безопасность из коробки** - подпись данных bot token
4. ✅ **Работает везде** - web, mobile web, десктоп
5. ✅ **Не требует сложной инфраструктуры** - не нужен Redis, WebSocket, bot сервер

### Когда использовать другие варианты?

- **Вариант 2 (WebApp)** - если ваш сайт в основном используется внутри Telegram
- **Вариант 3 (Bot + Deep Links)** - если нужна авторизация на localhost без домена

---

## 📝 Пошаговая реализация (Вариант 1)

### **Этап 1: Создание Telegram Bot**

1. Открыть [@BotFather](https://t.me/botfather) в Telegram
2. Отправить `/newbot`
3. Указать имя бота: `Fonana Auth Bot`
4. Указать username: `fonana_auth_bot` (должен заканчиваться на `_bot`)
5. Получить **Bot Token**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Настроить домен для авторизации:
   ```
   /setdomain
   → выбрать бота
   → указать: fonana.com (ваш домен)
   ```

---

### **Этап 2: Frontend интеграция**

#### **2.1. Установить библиотеку (опционально)**

```bash
npm install @telegram-auth/react
```

#### **2.2. Добавить скрипт Telegram Widget**

В `components/LogInMethodPopup.tsx`:

```typescript
// Добавить в useEffect
useEffect(() => {
  if (!isOpen) return
  
  // Динамически загружаем Telegram Widget script
  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.async = true
  script.setAttribute('data-telegram-login', 'fonana_auth_bot') // ← ваш bot username
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write')
  
  document.body.appendChild(script)
  
  return () => {
    document.body.removeChild(script)
  }
}, [isOpen])
```

#### **2.3. Обработка callback**

```typescript
// Глобальная функция для callback от Telegram
window.onTelegramAuth = async (user) => {
  console.log('Telegram user data:', user)
  // user = {
  //   id: 123456789,
  //   first_name: "John",
  //   last_name: "Doe",
  //   username: "johndoe",
  //   photo_url: "https://...",
  //   auth_date: 1234567890,
  //   hash: "abc123..." // подпись для проверки
  // }
  
  // Отправляем на backend
  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  
  const data = await response.json()
  // → получаем JWT токен
  
  // Сохраняем токен и авторизуем пользователя
  localStorage.setItem('fonana_jwt_token', data.token)
  // ... остальная логика
}
```

---

### **Этап 3: Backend API endpoint**

#### **3.1. Создать `/api/auth/telegram/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token'
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

// Проверка подписи от Telegram
function verifyTelegramAuth(authData: any): boolean {
  const { hash, ...data } = authData
  
  // Создаем строку для проверки
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n')
  
  // Вычисляем hash
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  
  return calculatedHash === hash
}

export async function POST(request: NextRequest) {
  try {
    const authData = await request.json()
    
    console.log('🔵 [TELEGRAM AUTH] Received data:', authData)
    
    // 1. Проверяем подпись
    if (!verifyTelegramAuth(authData)) {
      console.error('🔵 [TELEGRAM AUTH] Invalid signature!')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // 2. Проверяем, что данные не устарели (не старше 1 часа)
    const authDate = authData.auth_date * 1000
    const now = Date.now()
    if (now - authDate > 3600000) {
      return NextResponse.json({ error: 'Auth data expired' }, { status: 401 })
    }
    
    // 3. Ищем пользователя по telegramId
    let user = await prisma.user.findFirst({
      where: { telegramId: authData.id.toString() }
    })
    
    // 4. Если не найден - создаем нового
    if (!user) {
      console.log('🔵 [TELEGRAM AUTH] Creating new user for Telegram ID:', authData.id)
      
      // Генерируем уникальный nickname
      const baseNickname = authData.username || 
        `${authData.first_name}${authData.last_name || ''}`.toLowerCase().replace(/\s/g, '_')
      
      let nickname = baseNickname
      let counter = 1
      
      // Проверяем уникальность
      while (await prisma.user.findFirst({ where: { nickname } })) {
        nickname = `${baseNickname}${counter}`
        counter++
      }
      
      user = await prisma.user.create({
        data: {
          telegramId: authData.id.toString(),
          nickname: nickname,
          fullName: `${authData.first_name} ${authData.last_name || ''}`.trim(),
          avatar: authData.photo_url || null,
          // Генерируем fake wallet для совместимости
          wallet: `tg_${authData.id}_${Date.now()}`,
          solanaWallet: null,
        }
      })
      
      console.log('🔵 [TELEGRAM AUTH] User created:', user.id)
    }
    
    // 5. Генерируем JWT токен
    const token = jwt.sign(
      {
        userId: user.id,
        telegramId: authData.id,
        sub: user.id
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    
    // 6. Сохраняем токен в БД
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.$executeRaw`
      UPDATE users 
      SET token = ${token}, "tokenExpiresAt" = ${tokenExpiresAt}
      WHERE id = ${user.id}
    `
    
    console.log('🔵 [TELEGRAM AUTH] User authenticated:', user.id)
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        fullName: user.fullName,
        avatar: user.avatar,
      }
    })
    
  } catch (error) {
    console.error('🔵 [TELEGRAM AUTH] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
```

---

### **Этап 4: Database Schema**

Добавить поле `telegramId` в таблицу `users`:

```prisma
model User {
  id            String    @id @default(cuid())
  wallet        String?   @unique
  solanaWallet  String?   @unique
  telegramId    String?   @unique  // ← НОВОЕ ПОЛЕ
  nickname      String    @unique
  fullName      String?
  avatar        String?
  // ... остальные поля
}
```

Запустить миграцию:
```bash
npx prisma migrate dev --name add_telegram_id
```

---

### **Этап 5: Environment Variables**

Добавить в `.env`:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  LogInMethodPopup.tsx                        │      │
│  │                                              │      │
│  │  [Войти через Telegram] ← button             │      │
│  │         ↓                                    │      │
│  │  Telegram Widget (iframe/popup)              │      │
│  └──────────────────────────────────────────────┘      │
│                    ↓                                     │
│                    ↓ (user data + hash)                 │
│                    ↓                                     │
│  ┌──────────────────────────────────────────────┐      │
│  │  window.onTelegramAuth(user)                 │      │
│  │         ↓                                    │      │
│  │  POST /api/auth/telegram                     │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↓
                         ↓ HTTP Request
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Backend (Next.js API)                     │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │  /api/auth/telegram/route.ts                 │      │
│  │                                              │      │
│  │  1. Verify signature (crypto.createHmac)     │      │
│  │  2. Check auth_date (not expired)            │      │
│  │  3. Find user by telegramId                  │      │
│  │  4. Create user if not exists                │      │
│  │  5. Generate JWT token                       │      │
│  │  6. Return { token, user }                   │      │
│  └──────────────────────────────────────────────┘      │
│                    ↓                                     │
│                    ↓                                     │
│  ┌──────────────────────────────────────────────┐      │
│  │         PostgreSQL Database                  │      │
│  │                                              │      │
│  │  users table:                                │      │
│  │  - id                                        │      │
│  │  - telegramId (unique)                       │      │
│  │  - nickname                                  │      │
│  │  - wallet (generated: tg_{id}_{timestamp})   │      │
│  │  - token                                     │      │
│  │  - tokenExpiresAt                            │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↑
                         │
                         │ Signature verification
                         │
┌─────────────────────────────────────────────────────────┐
│                    Telegram Server                       │
│                                                          │
│  - Подписывает user data через BOT_TOKEN                │
│  - Отправляет через widget callback                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Безопасность

### Что проверяем:

1. ✅ **Signature verification** - данные подписаны bot token
2. ✅ **Timestamp validation** - auth_date не старше 1 часа
3. ✅ **HTTPS only** - Telegram требует HTTPS для production
4. ✅ **Domain whitelist** - настроен в @BotFather

### Что НЕ нужно делать:

- ❌ Не храните bot token в frontend коде
- ❌ Не пропускайте проверку подписи
- ❌ Не используйте HTTP в production

---

## 📊 Сравнение вариантов

| Критерий | Вариант 1 (Widget) | Вариант 2 (WebApp) | Вариант 3 (Bot) |
|----------|-------------------|-------------------|-----------------|
| **Простота** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Безопасность** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **UX** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Работает в браузере** | ✅ | ❌ | ✅ |
| **Работает в Telegram** | ✅ | ✅ | ✅ |
| **Требует домен** | ✅ | ❌ | ❌ |
| **Требует bot сервер** | ❌ | ❌ | ✅ |
| **Время реализации** | 1-2 часа | 3-4 часа | 6-8 часов |

---

## ✅ Чеклист реализации

### Подготовка:
- [ ] Создать Telegram Bot через @BotFather
- [ ] Получить Bot Token
- [ ] Настроить domain в @BotFather
- [ ] Добавить `TELEGRAM_BOT_TOKEN` в `.env`

### Database:
- [ ] Добавить поле `telegramId` в Prisma schema
- [ ] Запустить миграцию

### Backend:
- [ ] Создать `/api/auth/telegram/route.ts`
- [ ] Реализовать проверку подписи
- [ ] Реализовать создание/поиск пользователя
- [ ] Реализовать генерацию JWT токена

### Frontend:
- [ ] Добавить Telegram Widget в `LogInMethodPopup.tsx`
- [ ] Реализовать `window.onTelegramAuth` callback
- [ ] Отправка данных на backend
- [ ] Сохранение JWT токена
- [ ] Обновление UI после авторизации

### Testing:
- [ ] Протестировать на localhost (через ngrok)
- [ ] Протестировать на production домене
- [ ] Проверить создание нового пользователя
- [ ] Проверить вход существующего пользователя
- [ ] Проверить генерацию уникальных nickname

---

## 🚀 Дальнейшие улучшения

### Фаза 2 (опционально):
- 🔗 Возможность привязать кошелек к Telegram аккаунту
- 🔗 Возможность привязать Telegram к существующему кошельку
- 📧 Email verification через Telegram
- 💬 Уведомления через Telegram Bot

---

## 📚 Полезные ссылки

- [Telegram Login Widget Docs](https://core.telegram.org/widgets/login)
- [Telegram WebApp Docs](https://core.telegram.org/bots/webapps)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Дата создания:** 2 февраля 2026  
**Автор:** AI Assistant  
**Статус:** ✅ Ready for Implementation
