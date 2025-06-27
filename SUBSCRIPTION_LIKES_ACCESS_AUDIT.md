# Аудит бизнес-логики подписок, лайков и доступа к контенту Fonana

## Дата проведения: 27 декабря 2025
## Статус: ✅ ЗАВЕРШЕН

---

## Фаза 1: Аудит текущей бизнес-логики

### 1.1 Логика определения прав доступа

#### Серверная часть (API):
- **Файл**: `app/api/posts/route.ts`
- **Основная логика**: Строки 170-208

```typescript
// Проверяется в следующем порядке:
1. isCreatorPost - автор всегда видит свой контент
2. Если пост isSellable с minSubscriptionTier - проверяется подписка
3. Если есть minSubscriptionTier - проверяется уровень подписки через hasAccessToTier()
4. Если isPremium=true - считается VIP постом (legacy)
5. Если есть price и не isSellable - требуется покупка
6. Иначе - требуется любая подписка
```

**Функция проверки уровня доступа**:
```typescript
function hasAccessToTier(userTier: string | undefined, requiredTier: string | undefined): boolean {
  const TIER_HIERARCHY = { vip: 4, premium: 3, basic: 2, free: 1 }
  return userLevel >= requiredLevel
}
```

#### Клиентская часть:
- **Файл**: `app/creator/[id]/page.tsx`
- **Функция**: `checkTierAccess()` (строки 241-254)

```typescript
const checkTierAccess = (requiredTier: string | null, userTier: string): boolean => {
  const tierHierarchy = { free: 0, basic: 1, premium: 2, vip: 3 }
  return userLevel >= requiredLevel
}
```

### 1.2 Обработка подписок

#### Оформление подписки:
- **API endpoint**: `/api/subscriptions/process-payment`
- **Процесс**:
  1. Валидация цены против настроек создателя
  2. Ожидание подтверждения транзакции Solana
  3. Валидация распределения платежа
  4. Создание/обновление подписки с `paymentStatus: 'COMPLETED'`
  5. Создание записи транзакции
  6. Отправка WebSocket уведомлений

#### Проверка подписки:
- **API endpoint**: `/api/subscriptions/check`
- **Важно**: Проверяется `paymentStatus === 'COMPLETED'`

### 1.3 Логика лайков

#### API обработка:
- **Файл**: `app/api/posts/[id]/like/route.ts`
- **Процесс**:
  1. POST запрос с userId
  2. Проверка существования лайка
  3. Транзакция: создание/удаление лайка + обновление счетчика
  4. WebSocket уведомление
  5. Создание уведомления автору (если включено)

#### Клиентская обработка:
- **Компонент**: `components/posts/core/PostActions/index.tsx`
- **Действие**: Вызывает `onAction({ type: 'like'/'unlike', postId })`

### 1.4 WebSocket интеграция

- **События постов**: `post_created`, `post_liked`, `post_unliked`
- **События уведомлений**: `notification`, `notification_read`
- **События подписок**: `new_subscription`

---

## Фаза 2: Выявленные проблемы и слабые места

### 🔴 Критические проблемы:

#### 1. **Рассинхрон иерархии тиров**
- **Серверная часть**: `{ vip: 4, premium: 3, basic: 2, free: 1 }`
- **Клиентская часть**: `{ free: 0, basic: 1, premium: 2, vip: 3 }`
- **Последствия**: Неправильная проверка доступа на клиенте

#### 2. **Отсутствие централизованной константы тиров**
- Иерархия дублируется в нескольких местах
- Риск рассинхрона при изменениях

#### 3. **Неконсистентность проверки paymentStatus**
- `lib/db.ts` функции `getUserSubscriptions()` и `hasActiveSubscription()` проверяют
- Но не все места используют эти функции

### 🟡 Средние проблемы:

#### 4. **Дублирование логики проверки доступа**
- Серверная логика в `app/api/posts/route.ts`
- Клиентская логика в `app/creator/[id]/page.tsx`
- Компонентная логика в `PostContent` и `PostLocked`

#### 5. **Неоптимальная обработка лайков**
- Нет оптимистичных обновлений на клиенте
- Возможны задержки при медленном соединении

#### 6. **Case sensitivity в планах подписок**
- База хранит `Premium` с большой буквы
- Код проверяет `premium` с маленькой
- Используется `.toLowerCase()` не везде

#### 7. **Legacy поля**
- `isPremium` все еще используется для обратной совместимости
- Создает путаницу с новой системой тиров

### 🟢 Незначительные проблемы:

#### 8. **Отсутствие типизации для тиров**
- Нет enum или union type для `'basic' | 'premium' | 'vip'`
- Используются строковые литералы

#### 9. **Неполное логирование**
- Не все критические операции логируются
- Сложно отлаживать проблемы в продакшне

---

## Фаза 3: План исправления

### Приоритет 1: Критические исправления

#### 1. **Унификация иерархии тиров**
```typescript
// lib/constants/tiers.ts (НОВЫЙ ФАЙЛ)
export const TIER_HIERARCHY = {
  free: 1,
  basic: 2,
  premium: 3,
  vip: 4
} as const

export type TierName = keyof typeof TIER_HIERARCHY
```

#### 2. **Централизованная функция проверки доступа**
```typescript
// lib/utils/access.ts (НОВЫЙ ФАЙЛ)
import { TIER_HIERARCHY } from '@/lib/constants/tiers'

export function hasAccessToTier(
  userTier: string | undefined, 
  requiredTier: string | undefined
): boolean {
  if (!requiredTier) return true
  if (!userTier) return false
  
  const userLevel = TIER_HIERARCHY[userTier.toLowerCase() as TierName] || 0
  const requiredLevel = TIER_HIERARCHY[requiredTier.toLowerCase() as TierName] || 0
  
  return userLevel >= requiredLevel
}
```

### Приоритет 2: Оптимизация и консистентность

#### 3. **Оптимистичные обновления для лайков**
```typescript
// В PostActions компоненте
const [optimisticLikes, setOptimisticLikes] = useState(post.engagement.likes)
const [optimisticIsLiked, setOptimisticIsLiked] = useState(post.engagement.isLiked)

const handleLike = async () => {
  // Оптимистичное обновление
  setOptimisticIsLiked(!optimisticIsLiked)
  setOptimisticLikes(optimisticIsLiked ? optimisticLikes - 1 : optimisticLikes + 1)
  
  try {
    await onAction({ type: optimisticIsLiked ? 'unlike' : 'like', postId: post.id })
  } catch (error) {
    // Откат при ошибке
    setOptimisticIsLiked(post.engagement.isLiked)
    setOptimisticLikes(post.engagement.likes)
  }
}
```

#### 4. **Нормализация планов подписок**
```typescript
// lib/utils/subscriptions.ts
export function normalizeSubscriptionPlan(plan: string): TierName {
  return plan.toLowerCase() as TierName
}

// Использовать везде при загрузке подписок
```

### Приоритет 3: Рефакторинг и улучшения

#### 5. **Единый сервис проверки доступа**
```typescript
// lib/services/accessService.ts
export class AccessService {
  static checkPostAccess(post: Post, user?: User, subscription?: Subscription): AccessResult {
    // Вся логика проверки доступа в одном месте
  }
  
  static getRequiredAction(post: Post, accessResult: AccessResult): PostAction | null {
    // Определение необходимого действия для разблокировки
  }
}
```

#### 6. **Улучшенное логирование**
```typescript
// Добавить структурированное логирование для:
- Всех проверок доступа
- Операций с подписками
- Обработки лайков
- WebSocket событий
```

---

## Рекомендации по внедрению

### Этап 1 (1-2 дня):
1. ✅ Создать файл констант `lib/constants/tiers.ts`
2. ✅ Создать утилиты проверки доступа `lib/utils/access.ts`
3. ✅ Заменить все hardcoded иерархии на импорт констант
4. ✅ Протестировать на тестовом сервере

### Этап 2 (2-3 дня):
1. ✅ Добавить оптимистичные обновления для лайков
2. ✅ Нормализовать все операции с планами подписок
3. ✅ Удалить legacy проверки `isPremium` (с миграцией данных)

### Этап 3 (3-5 дней):
1. ✅ Создать централизованный AccessService
2. ✅ Рефакторинг всех компонентов для использования AccessService
3. ✅ Добавить подробное логирование
4. ✅ Полное тестирование и деплой

---

## Ожидаемые результаты

1. **Единообразная логика доступа** на клиенте и сервере
2. **Мгновенная реакция** на действия пользователя (лайки)
3. **Упрощенная поддержка** благодаря централизации
4. **Улучшенная отладка** через структурированное логирование
5. **Снижение багов** связанных с рассинхроном логики

---

## Метрики успеха

- 0 жалоб на неправильный доступ к контенту
- Время отклика лайков < 100ms (визуально мгновенно)
- Снижение времени на отладку проблем доступа на 70%
- 100% покрытие тестами критической логики

---

**Подготовлено**: AI Assistant  
**Дата**: 27 декабря 2025  
**Версия**: 1.0 