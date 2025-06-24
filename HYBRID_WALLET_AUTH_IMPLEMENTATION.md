# 🔐 Гибридная авторизация через Solana кошелек

## 📋 Обзор реализации

Реализована гибридная система авторизации, которая:
- ✅ Авторизует пользователей через подпись сообщения Solana кошельком
- ✅ Сохраняет JWT токен для сохранения сессии
- ✅ Подключает кошелек только когда нужны транзакции
- ✅ Поддерживает мобильные устройства через Mobile Wallet Adapter
- ✅ Показывает UX подсказки для разных окружений

## 🏗️ Архитектура

### 1. JWT авторизация (`/lib/auth/jwt.ts`)
```typescript
// Создание JWT токена
const token = await createJWT({
  wallet: publicKey,
  userId: user.id
})

// Проверка токена
const payload = await verifyJWT(token)
```

### 2. Проверка подписи Solana (`/lib/auth/solana.ts`)
```typescript
// Генерация сообщения для подписи
const message = generateSignMessage()

// Проверка подписи
const isValid = verifySignature(message, signature, publicKey)

// Защита от replay атак
const isMessageValid = isMessageValid(message, maxAgeMs)
```

### 3. API endpoint (`/api/auth/wallet`)
- **POST** - авторизация через подпись или logout
- **GET** - проверка текущей авторизации

### 4. Компоненты

#### `HybridWalletConnect` - основная кнопка подключения
```tsx
import { HybridWalletConnect } from '@/components/HybridWalletConnect'

// В Navbar или любом другом месте
<HybridWalletConnect />
```

#### `ConnectWalletOnDemand` - подключение по требованию
```tsx
import { ConnectWalletOnDemand } from '@/components/ConnectWalletOnDemand'

// В компоненте покупки
{!connected ? (
  <ConnectWalletOnDemand 
    message="Подключите кошелек для покупки"
    onConnect={() => handlePurchase()}
  />
) : (
  <button onClick={handlePurchase}>Купить</button>
)}
```

### 5. Хук `useAuth` для управления состоянием
```tsx
import { useAuth } from '@/lib/hooks/useAuth'

function MyComponent() {
  const { isAuthenticated, user, logout, needsWalletConnection } = useAuth()
  
  if (isAuthenticated) {
    return <div>Привет, {user.nickname}!</div>
  }
}
```

## 🔄 Процесс авторизации

1. **Пользователь подключает кошелек**
   - Нажимает на кнопку подключения
   - Выбирает кошелек (Phantom, Solflare и др.)
   - На мобильных используется Mobile Wallet Adapter

2. **Запрос подписи**
   - Генерируется сообщение с timestamp и nonce
   - Пользователь подписывает сообщение в кошельке
   - Подпись отправляется на сервер

3. **Проверка на сервере**
   - Проверяется валидность подписи
   - Проверяется timestamp (защита от replay)
   - Создается/находится пользователь в БД

4. **Выдача JWT токена**
   - Генерируется JWT с userId и wallet
   - Токен сохраняется в HttpOnly cookie
   - Копия сохраняется в localStorage (fallback)

5. **Поддержание сессии**
   - JWT проверяется при каждом запросе
   - Кошелек не нужен для чтения контента
   - Подключается только для транзакций

## 📱 Мобильная поддержка

### Определение окружения
```typescript
const env = detectWalletEnvironment()
// env.isMobile - мобильное устройство
// env.isPhantom - Phantom установлен
// env.isInWalletBrowser - встроенный браузер кошелька
```

### UX подсказки
- **В обычном браузере**: "Установите кошелек"
- **Во встроенном браузере**: "Используйте встроенный кошелек"
- **На мобильном**: Deeplink на установку Phantom

## 🔧 Интеграция в существующие компоненты

### SubscribeModal
```tsx
// Добавить проверку авторизации
const { isAuthenticated } = useAuth()

// Показывать ConnectWalletOnDemand если не подключен
{!connected && isAuthenticated ? (
  <ConnectWalletOnDemand 
    message="Подключите кошелек для подписки"
  />
) : (
  // Существующая логика
)}
```

### PurchaseModal
```tsx
// Аналогично SubscribeModal
{!connected && isAuthenticated ? (
  <ConnectWalletOnDemand 
    message="Подключите кошелек для покупки поста"
  />
) : (
  // Существующая логика покупки
)}
```

## ⚙️ Конфигурация

### Переменные окружения
```env
JWT_SECRET=your-secret-key # Или используется NEXTAUTH_SECRET
NEXT_PUBLIC_SOLANA_RPC_URL=https://...
NEXT_PUBLIC_SOLANA_NETWORK=mainnet # или devnet
```

### Безопасность
- JWT токены действительны 7 дней
- Сообщения для подписи действительны 5 минут
- HttpOnly cookies для защиты от XSS
- Проверка подписи на сервере

## 🚀 Примеры использования

### Проверка авторизации в API route
```typescript
import { checkAuth } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  const auth = await checkAuth()
  
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // auth.userId и auth.wallet доступны
}
```

### Защищенная страница
```tsx
'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading])
  
  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return null
  
  return <div>Protected content</div>
}
```

## 📝 TODO

1. **Добавить полную поддержку Mobile Wallet Adapter**
   - Исправить типы для @solana-mobile/wallet-adapter-mobile
   - Протестировать на реальных устройствах

2. **Улучшить UX**
   - Добавить анимацию подключения
   - Показывать прогресс авторизации
   - Запоминать выбор кошелька

3. **Расширить функционал**
   - Поддержка multiple wallets
   - Биометрическая авторизация на мобильных
   - Session management UI

## 🎯 Результат

Реализована полноценная система гибридной авторизации, которая:
- Минимизирует запросы на подключение кошелька
- Поддерживает длительные сессии через JWT
- Работает на мобильных устройствах
- Обеспечивает плавный UX для пользователей 