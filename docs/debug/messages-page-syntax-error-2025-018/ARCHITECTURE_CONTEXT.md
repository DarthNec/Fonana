# 🏗️ ARCHITECTURE CONTEXT: Messages Page Component

**Дата:** 19.01.2025  
**Компонент:** `app/messages/[id]/page.tsx`  
**Размер:** 1387 строк кода  
**Тип:** Next.js App Router Page Component  

## 🔍 КОМПОНЕНТНАЯ АРХИТЕКТУРА

### Основная Функция
```typescript
export default function ConversationPage() {
  // 1387 строк функциональности
}
```

### Зависимости и Импорты
```typescript
// React Core
import { useState, useEffect, useRef, useCallback } from 'react'

// Solana Integration  
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

// Next.js Routing
import { useParams, useRouter } from 'next/navigation'

// UI Libraries
import { 40+ icons } from '@heroicons/react/24/outline'
import Link from 'next/link'

// Shadcn/UI Components
import { Separator } from '@/components/ui/Separator'
import { ScrollArea } from '@/components/ui/ScrollArea' 
import { ShadcnAvatar, ShadcnAvatarImage, ShadcnAvatarFallback } from '@/components/ui/ShadcnAvatar'

// Custom Components
import OptimizedImage from '@/components/OptimizedImage'

// Business Logic
import { jwtManager } from '@/lib/utils/jwt'
import { useUser } from '@/lib/store/appStore'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { createPostPurchaseTransaction, createTipTransaction } from '@/lib/solana/payments'

// Utils
import toast from 'react-hot-toast'
```

## 📊 STATE АРХИТЕКТУРА

### Core State (26 переменных)
```typescript
// Message Data
const [messages, setMessages] = useState<Message[]>([])
const [participant, setParticipant] = useState<Participant | null>(null)

// Loading States
const [isLoading, setIsLoading] = useState(true)
const [isSending, setIsSending] = useState(false)  
const [isPurchasing, setIsPurchasing] = useState<string | null>(null)
const [isUploadingMedia, setIsUploadingMedia] = useState(false)
const [isSendingTip, setIsSendingTip] = useState(false)

// Form States
const [messageText, setMessageText] = useState('')
const [messagePrice, setMessagePrice] = useState('')
const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
const [mediaPreview, setMediaPreview] = useState<string | null>(null)
const [tipAmount, setTipAmount] = useState('')

// UI States
const [isPaidMessage, setIsPaidMessage] = useState(false)
const [showTipModal, setShowTipModal] = useState(false)
const [showQuickTips, setShowQuickTips] = useState(false)

// Pagination & Circuit Breaker
const [hasMore, setHasMore] = useState(false)
const [lastMessageCount, setLastMessageCount] = useState(0)
const [circuitBreakerState, setCircuitBreakerState] = useState({...})
const [conversationLoadState, setConversationLoadState] = useState({...})
```

### Refs
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null)
const fileInputRef = useRef<HTMLInputElement>(null)
```

## 🔄 DATA FLOW АРХИТЕКТУРА

### API Integrations
1. **GET** `/api/messages/${conversationId}` - Load messages
2. **POST** `/api/messages` - Send new message  
3. **GET** `/api/conversations/${conversationId}` - Load conversation info
4. **POST** `/api/messages/${messageId}/purchase` - Purchase paid message
5. **POST** `/api/tips` - Send tips
6. **POST** `/api/upload/media` - Upload media files

### WebSocket Connection
- **Status:** Отключен для стабилизации `[critical_regression_2025_017]`
- **Potential:** Real-time message updates через ws://localhost:3002

### Solana Integration Flow
```typescript
1. User triggers action (tip/purchase)
2. createTipTransaction() / createPostPurchaseTransaction()
3. sendTransaction() через Solana wallet
4. Wait for blockchain confirmation (10s timeout)
5. API call для сохранения в базе
6. Local state update
```

## 🎨 UI АРХИТЕКТУРА

### Layout Structure
```jsx
<div className="min-h-screen"> {/* Main Container */}
  {/* Header с Back Button + Participant Info */}
  <div className="sticky top-0 z-40">
    <Link href="/messages"> {/* Back Button */}
    <div className="participant-info">
      <ShadcnAvatar />
      <UserInfo />
    </div>
  </div>
  
  {/* Messages Area */}
  <ScrollArea className="flex-1 px-4">
    <div className="space-y-4 py-4">
      {isLoading ? <LoadingSpinner /> : 
       messages.length === 0 ? <EmptyState /> : 
       <MessagesRenderer />}
    </div>
  </ScrollArea>
  
  {/* Input Area */}
  <div className="sticky bottom-0">
    {showQuickTips && <QuickTipsBar />}
    <MessageInput />
  </div>
  
  {/* Modals */}
  {showTipModal && <TipModal />}
</div>
```

### Critical JSX Patterns
```jsx
// Conditional Rendering with Complex Nesting
{isLoading ? (
  <LoadingDiv />
) : messages.length === 0 ? (
  <EmptyDiv />  
) : (
  <>  {/* React Fragment - potential source of issues */}
    {hasMore && <LoadMoreButton />}
    {messages.slice().reverse().map((message, index) => (
      <MessageComponent key={message.id}>
        {/* Deep nesting с Date Separators */}
        {showDateSeparator && <DateSeparator />}
        <MessageBubble>
          {/* Условный контент по типу сообщения */}
        </MessageBubble>
      </MessageComponent>
    ))}
    <div ref={messagesEndRef} />
  </>
)}
```

## 🔗 INTEGRATION POINTS

### External Dependencies
- **Solana Wallet:** Phantom wallet connection
- **JWT Authentication:** Bearer token для API calls  
- **File Upload:** Media attachment system
- **Toast Notifications:** react-hot-toast
- **Rate Conversion:** SOL to USD через useSolRate

### Internal Dependencies  
- **Store:** Zustand appStore для user state
- **Routing:** Next.js App Router
- **Theming:** Dark/Light mode через Tailwind
- **Components:** Shadcn/UI component system

## ⚠️ АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### Performance Issues
- **Large Component:** 1387 строк в одном файле
- **Complex State:** 26+ state variables 
- **Heavy Re-renders:** Много useEffect зависимостей

### Code Quality Issues
- **No Code Splitting:** Весь функционал в одном компоненте
- **Mixed Concerns:** UI + Business Logic + API calls вместе
- **Deep Nesting:** JSX complexity высокая

### Type Safety
```typescript
interface Message {
  id: string
  content?: string | null  // Optional fields могут создавать проблемы
  mediaUrl?: string | null
  mediaType?: string | null
  isPaid: boolean
  price?: number
  isPurchased: boolean
  // ... много optional полей
}
```

## 🚨 КРИТИЧЕСКИЕ СВЯЗИ

### Компонент зависит от:
1. **JWT Manager** - Для аутентификации API calls
2. **Solana Wallet** - Для blockchain транзакций  
3. **User Store** - Для current user данных
4. **Toast System** - Для уведомлений
5. **File Upload Service** - Для media attachments
6. **Shadcn/UI Components** - Для UI rendering

### На компонент влияют:
1. **WebSocket Connection State** - Если включен
2. **Wallet Connection Status** - Определяет доступность функций
3. **Network Latency** - Влияет на UX
4. **File Size Limits** - Ограничивает uploads
5. **JWT Token Expiry** - Может сломать API calls

## 📋 ЧЕКЛИСТ АРХИТЕКТУРЫ

- [x] Все зависимости идентифицированы
- [x] State структура проанализирована  
- [x] Data flow mapping завершен
- [x] UI архитектура понята
- [x] Integration points документированы
- [x] Performance bottlenecks найдены
- [x] Critical dependencies выявлены
- [ ] **Скрытые зависимости проверены**
- [ ] **Error boundaries состояние**
- [ ] **Memory leaks potential**

## 🎯 ВЫВОДЫ

**Компонент критически сложный** и требует:
1. **Careful JSX handling** - Глубокая вложенность
2. **State management attention** - Много moving parts
3. **Error boundary protection** - Нет fallback для crashes
4. **Performance optimization** - Слишком много в одном месте

**Любые изменения должны учитывать все 26 state variables и 6+ integration points!** 