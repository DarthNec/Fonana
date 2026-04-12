# 📧 Email/Password Authentication Setup

## ✅ ЧТО СДЕЛАНО:

### 1. **Prisma Schema обновлён:**
- ✅ Добавлено поле `password` в модель `User` (nullable)
- ✅ Создана модель `EmailVerificationCode` для временного хранения кодов

### 2. **SQL Миграция создана:**
- 📁 `prisma/migrations/20260321_add_email_auth/migration.sql`

### 3. **API Endpoints созданы:**

#### **📤 POST `/api/auth/email/send-code`**
Отправка кода подтверждения на email
- Проверяет, существует ли пользователь с таким email
- Генерирует 6-значный код
- Хеширует пароль
- Сохраняет в `email_verification_codes` (10 минут TTL)
- Отправляет красивое HTML письмо через nodemailer

#### **✅ POST `/api/auth/email/verify-code`**
Подтверждение кода и создание пользователя
- Проверяет код и срок действия
- Создаёт пользователя с fake wallet `EMAIL_xxx`
- Генерирует nickname как у гостевых
- Назначает случайный аватар
- Удаляет использованный код

#### **🔐 POST `/api/auth/email/login`**
Вход через email/password
- Проверяет email и пароль
- Возвращает данные пользователя

---

## 🚀 УСТАНОВКА:

### Шаг 1: Установи зависимости
```bash
npm install nodemailer bcryptjs
npm install --save-dev @types/nodemailer @types/bcryptjs
```

### Шаг 2: Добавь в .env
```env
# Email Configuration (для nodemailer)
EMAIL_USER="your-email@privateemail.com"
EMAIL_PASS="your-email-password"
```

### Шаг 3: Примени миграцию
```bash
npx prisma migrate deploy
```

### Шаг 4: Сгенерируй Prisma Client
```bash
npx prisma generate
```

### Шаг 5: Перезапусти dev server
```bash
npm run dev
```

---

## 📋 СТРУКТУРА ТАБЛИЦЫ `email_verification_codes`:

```sql
id          TEXT PRIMARY KEY
email       TEXT NOT NULL (indexed)
code        TEXT NOT NULL (6 digits, indexed)
password    TEXT NOT NULL (hashed with bcrypt)
createdAt   TIMESTAMP DEFAULT NOW()
expiresAt   TIMESTAMP NOT NULL (indexed)
```

**Логика:**
- Код действителен 10 минут
- При регистрации код удаляется
- Истекшие коды нужно периодически чистить (TODO: cron job)

---

## 📧 ПРИМЕР ПИСЬМА:

**Subject:** Your Fonana Verification Code

**Содержание:**
```
Welcome to Fonana! 🎨

Your email verification code is:

┌─────────────────┐
│    123456       │  ← Фиолетово-розовый градиент
└─────────────────┘

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Fonana Team
```

---

## 🔄 FLOW РЕГИСТРАЦИИ:

### Frontend:
1. User вводит email + password в форме signup
2. Frontend вызывает `POST /api/auth/email/send-code`
3. User получает письмо с кодом
4. User вводит код в форме
5. Frontend вызывает `POST /api/auth/email/verify-code`
6. User создан → переход к авторизации

### Frontend Login:
1. User вводит email + password
2. Frontend вызывает `POST /api/auth/email/login`
3. Получаем данные пользователя
4. Сохраняем wallet в localStorage
5. Получаем JWT через jwtManager
6. Эмулируем connected=true в walletStore
7. User авторизован

---

## 🔐 БЕЗОПАСНОСТЬ:

✅ **Пароли:** Хешируются через `bcryptjs` (salt rounds: 10)
✅ **Email validation:** Проверка формата на backend
✅ **Code expiry:** 10 минут
✅ **Duplicate check:** Проверка существования email перед отправкой кода
✅ **One-time codes:** Код удаляется после использования

---

## 📝 TODO (для фронтенда):

### В `LogInMethodPopup.tsx`:

#### 1. Обновить `handleSignup`:
```tsx
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsEmailLoading(true)
  
  try {
    const response = await fetch('/api/auth/email/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error)
    }
    
    toast.success('Verification code sent to your email!')
    // TODO: Показать форму ввода кода
    setViewMode('verify-code') // Новый режим!
    
  } catch (error) {
    toast.error(error.message)
  } finally {
    setIsEmailLoading(false)
  }
}
```

#### 2. Добавить режим `verify-code`:
```tsx
const [viewMode, setViewMode] = useState<'login' | 'signup' | 'forgot-password' | 'verify-code'>('login')
const [verificationCode, setVerificationCode] = useState('')
```

#### 3. Создать форму ввода кода:
```tsx
{viewMode === 'verify-code' && (
  <form onSubmit={handleVerifyCode}>
    <input
      type="text"
      maxLength={6}
      value={verificationCode}
      onChange={(e) => setVerificationCode(e.target.value)}
      placeholder="Enter 6-digit code"
    />
    <button type="submit">Verify & Create Account</button>
  </form>
)}
```

#### 4. Обработчик подтверждения:
```tsx
const handleVerifyCode = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const response = await fetch('/api/auth/email/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code: verificationCode })
  })
  
  const data = await response.json()
  
  if (data.success) {
    // Пользователь создан!
    // Далее логика как при Telegram/Google авторизации:
    // 1. localStorage.setItem('fonana_user_wallet', data.user.wallet)
    // 2. localStorage.setItem('fonana_email_auth', 'true')
    // 3. jwtManager.getToken()
    // 4. setUser(data.user)
    // 5. useWalletStore.updateState({ connected: true, publicKey: null })
    // 6. loadSubscriptions(), loadLikes()
  }
}
```

#### 5. Обновить `handleEmailLogin`:
```tsx
const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const response = await fetch('/api/auth/email/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const data = await response.json()
  
  if (data.success) {
    // Авторизация успешна!
    // Логика как при Telegram/Google (см. выше)
  }
}
```

---

## 🧹 ОЧИСТКА ИСТЕКШИХ КОДОВ (TODO):

Создать cron job или API endpoint:

```typescript
// app/api/auth/email/cleanup/route.ts
export async function POST() {
  await prisma.emailVerificationCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  return NextResponse.json({ success: true })
}
```

Вызывать каждые 15 минут через Vercel Cron или внешний сервис.

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ:

1. ✅ Установи зависимости
2. ✅ Добавь EMAIL_USER и EMAIL_PASS в .env
3. ✅ Примени миграцию
4. ✅ Обнови LogInMethodPopup.tsx (см. TODO выше)
5. ✅ Добавь поддержку в WalletStoreSync.tsx для `fonana_email_auth`
6. ✅ Тестируй!

---

**Готово!** 🚀 Вся backend логика для email/password авторизации реализована!
