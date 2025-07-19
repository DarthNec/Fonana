# 🏗️ ARCHITECTURE CONTEXT: Subscription System Analysis

## 📅 Дата: 18.01.2025
## 🎯 Контекст: Система подписок и управления доступом к контенту

## 🔴 ВЫЯВЛЕННАЯ ПРОБЛЕМА #1: Несоответствие тиров

### Данные из БД:
- **lafufu** подписан на **fonanadev** с тиром **Free**
- Пост `cmd7wi26a000nd6txdtjipf75` требует минимум **Basic** тир
- Поэтому доступ корректно заблокирован

### Архитектурная проблема:
Пользователь думает, что подписался на Basic, но в БД записан Free тир.

## 📐 АРХИТЕКТУРА СИСТЕМЫ ПОДПИСОК

### 1. Компоненты системы тиров:
```
┌─────────────────┐
│   Frontend      │
│  SubscribeModal │──────┐
└─────────────────┘      │
                         ▼
┌─────────────────┐  ┌──────────────────┐
│ API /subscribe  │  │ Solana Payment   │
└─────────────────┘  └──────────────────┘
         │                    │
         ▼                    │
┌─────────────────┐          │
│   Database      │◄─────────┘
│  subscriptions  │
└─────────────────┘
```

### 2. Проверка доступа к контенту:
- **Файл**: `lib/utils/access.ts`
- **Функция**: `checkPostAccess()`
- **Логика**: 
  - Free < Basic < Premium < VIP
  - Проверяется `minSubscriptionTier` поста против `plan` подписки

### 3. Real-time обновления:
- **WebSocket события**: `subscription_updated`
- **Обработчики**:
  - `useOptimizedRealtimePosts.handleSubscriptionUpdated()`
  - `useRealtimePosts.handleSubscriptionUpdated()`
- **Проблема**: События могут не доходить из-за JWT токенов

## 🔗 КОМПОНЕНТЫ И ИХ СВЯЗИ

### 1. Управление подписками (ПОТЕРЯНО):
- `components/UserSubscriptions.tsx` - список подписок пользователя
- `components/SubscriptionManager.tsx` - управление видимостью
- **НЕ ПОДКЛЮЧЕНЫ** к дашборду!

### 2. Создание подписок:
- `components/SubscribeModal.tsx` - модальное окно
- `app/api/subscriptions/route.ts` - API endpoint
- `lib/solana/payments.ts` - обработка платежей

### 3. Доступ к контенту:
- `lib/utils/access.ts` - логика проверки
- `components/posts/core/PostCard/index.tsx` - UI блокировки
- `lib/hooks/useOptimizedPosts.ts` - загрузка с проверкой доступа

## 🔌 ТОЧКИ ИНТЕГРАЦИИ

### 1. Dashboard Page (`app/dashboard/page.tsx`):
```tsx
// Текущее состояние:
<DashboardPageClient />
// Отсутствует:
// <UserSubscriptions />
// <SubscriptionManager />
```

### 2. WebSocket Server (`websocket-server/`):
- Требует JWT токен для аутентификации
- События `subscription_updated` не доставляются на клиент
- Нет интеграции с NextAuth для получения токенов

### 3. Навигация:
- Нет ссылок на управление подписками
- Функционал скрыт от пользователей

## 🔄 ПАТТЕРНЫ ДАННЫХ

### 1. Subscription Entity:
```typescript
interface Subscription {
  id: string
  userId: string
  creatorId: string
  plan: 'Free' | 'basic' | 'premium' | 'vip'
  price: number
  currency: string
  isActive: boolean
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
  subscribedAt: Date
  validUntil: Date
}
```

### 2. Post Access:
```typescript
interface PostAccess {
  hasAccess: boolean
  isLocked: boolean
  isSubscribed: boolean
  isPurchased: boolean
  tier?: string
  userTier?: string
  shouldHideContent: boolean
}
```

## 🚨 ВЫЯВЛЕННЫЕ ЗАВИСИМОСТИ

### 1. Frontend → Backend:
- React компоненты зависят от API endpoints
- WebSocket клиент требует JWT токены
- Кэширование настроек в CacheManager

### 2. Backend → Database:
- Prisma ORM для работы с PostgreSQL
- Проверка подписок через JOIN запросы
- Транзакции для атомарности операций

### 3. Blockchain → Database:
- Solana платежи создают записи в БД
- Статус платежа обновляется асинхронно
- Требуется синхронизация состояний

## ✅ ЧЕКЛИСТ АРХИТЕКТУРНОГО АНАЛИЗА

- [x] Все связи учтены? Да, найдены все компоненты
- [x] Скрытые зависимости? WebSocket требует JWT
- [x] Паттерны данных понятны? Да, структуры определены
- [x] Точки интеграции найдены? Да, Dashboard и WebSocket

## 🎯 КЛЮЧЕВЫЕ ПРОБЛЕМЫ

1. **Несоответствие тиров**: lafufu имеет Free вместо Basic
2. **Компоненты не интегрированы**: UserSubscriptions не в дашборде
3. **WebSocket не работает**: JWT токены не передаются
4. **Навигация отсутствует**: Нет ссылок на управление 