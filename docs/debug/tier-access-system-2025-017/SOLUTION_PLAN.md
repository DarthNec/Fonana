# 📋 ПЛАН РЕШЕНИЯ - Полная система доступа к контенту
**ID**: [content_access_system_2025_017]  
**Дата**: 17.07.2025  
**Методология**: M7

## 🎯 ЦЕЛЬ
Восстановить и оптимизировать полную 6-уровневую систему доступа к контенту с визуальной дифференциацией, blur эффектами и upgrade промптами.

## 📊 6 ТИПОВ КОНТЕНТА

### 1. **FREE** (Бесплатный)
- Доступен всем
- Без рамки и фона
- Иконка: 🔓

### 2. **BASIC** (Базовая подписка)
- Доступен: Basic, Premium, VIP подписчикам
- Синяя рамка и фон
- Иконка: ⭐

### 3. **PREMIUM** (Премиум подписка)
- Доступен: Premium, VIP подписчикам
- Фиолетовая рамка и фон
- Иконка: 💎

### 4. **VIP** (VIP подписка)
- Доступен: только VIP подписчикам
- Золотая рамка и фон
- Иконка: 👑

### 5. **PAID** (Платный контент)
- Единоразовая оплата за доступ
- Желто-оранжевая рамка
- Иконка: 💰

### 6. **SELLABLE** (Товары)
- Продажа физических/цифровых товаров
- Оранжево-красная рамка
- Статус: "For Sale" или "SOLD"
- Может комбинироваться с любым типом доступа

## 🔧 ФАЗЫ РЕАЛИЗАЦИИ

### 📝 **Phase 1: Расширение типов и констант** (15 мин)

#### 1.1. Создать единые типы доступа
```typescript
// types/posts/access.ts
export enum PostAccessType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
  PAID = 'paid'
}

export interface PostAccessInfo {
  type: PostAccessType
  tier?: TierName
  price?: number
  hasAccess: boolean
  isCreatorPost: boolean
  shouldBlur: boolean
  upgradePrompt?: string
  requiredTier?: TierName
  userTier?: TierName
}
```

#### 1.2. Расширить визуальные константы
```typescript
// lib/constants/tier-styles.ts
export const TIER_BLUR_STYLES = {
  backdrop: 'backdrop-blur-md',
  overlay: 'bg-white/80 dark:bg-slate-900/80',
  content: 'opacity-30'
}

export const TIER_UPGRADE_PROMPTS = {
  basic: 'Upgrade to Basic to unlock this content',
  premium: 'Upgrade to Premium for exclusive access',
  vip: 'Join VIP for ultimate experience',
  paid: 'Purchase to unlock this content'
}
```

### 🔄 **Phase 2: Обновление логики доступа** (20 мин)

#### 2.1. Расширить checkPostAccess
- Добавить shouldBlur флаг
- Генерировать upgradePrompt
- Обработать все 6 типов контента

#### 2.2. Добавить определение типа доступа
```typescript
function getPostAccessType(post: Post): PostAccessType {
  if (post.price && post.isLocked && !post.isSellable) return PostAccessType.PAID
  if (post.minSubscriptionTier === 'vip') return PostAccessType.VIP
  if (post.minSubscriptionTier === 'premium') return PostAccessType.PREMIUM
  if (post.minSubscriptionTier === 'basic') return PostAccessType.BASIC
  return PostAccessType.FREE
}
```

### 🎨 **Phase 3: UI компоненты** (25 мин)

#### 3.1. Обновить PostCard
- Применить стили из TIER_VISUAL_DETAILS
- Добавить blur эффект для недоступного контента
- Показывать upgrade промпты
- Добавить SOLD индикатор

#### 3.2. Структура рендеринга
```tsx
<div className={getTierCardStyles(post)}>
  {/* Tier Badge */}
  <PostTierBadge tier={accessInfo.requiredTier} />
  
  {/* Content with blur */}
  <div className={shouldBlur ? TIER_BLUR_STYLES.content : ''}>
    {/* Post content */}
  </div>
  
  {/* Blur Overlay */}
  {shouldBlur && (
    <div className={TIER_BLUR_STYLES.overlay}>
      <UpgradePrompt 
        tier={accessInfo.requiredTier}
        message={accessInfo.upgradePrompt}
      />
    </div>
  )}
  
  {/* Sold Badge */}
  {post.isSellable && post.soldAt && <SoldBadge />}
</div>
```

#### 3.3. Стили карточек по тирам
```typescript
function getTierCardStyles(post: Post): string {
  const tier = getPostAccessType(post)
  const visual = TIER_VISUAL_DETAILS[tier]
  
  return cn(
    'relative overflow-hidden transition-all duration-300',
    visual.border,
    'border-2',
    `bg-gradient-to-br ${visual.gradient}`,
    'hover:shadow-lg'
  )
}
```

### 🧪 **Phase 4: Тестирование** (10 мин)

#### 4.1. Создать тестовые посты
- FREE пост - без ограничений
- BASIC пост - для базовых подписчиков
- PREMIUM пост - для премиум подписчиков
- VIP пост - для VIP подписчиков
- PAID пост - с ценой 0.1 SOL
- SELLABLE пост - товар за 0.5 SOL

#### 4.2. Проверить визуальные эффекты
- ✅ Рамки соответствуют тирам
- ✅ Фоновые градиенты работают
- ✅ Blur применяется к недоступному контенту
- ✅ Upgrade промпты показываются
- ✅ SOLD бейдж отображается

#### 4.3. Валидировать логику доступа
- ✅ Автор видит все свои посты
- ✅ VIP видит все тиры
- ✅ Premium видит Premium/Basic/Free
- ✅ Basic видит Basic/Free
- ✅ Free видит только Free

## 📊 КРИТЕРИИ УСПЕХА

### Функциональные:
1. ✅ 6 типов контента работают корректно
2. ✅ Визуальная дифференциация по тирам
3. ✅ Blur эффект для недоступного контента
4. ✅ Upgrade промпты с правильными сообщениями
5. ✅ Sellable посты показывают статус продажи

### Технические:
1. ✅ Минимальные изменения в БД (используем существующие поля)
2. ✅ Переиспользование существующих компонентов
3. ✅ Оптимизированная производительность
4. ✅ Типобезопасность через TypeScript

### UX:
1. ✅ Четкая визуальная иерархия
2. ✅ Понятные призывы к действию
3. ✅ Плавные анимации и переходы
4. ✅ Консистентный дизайн

## 🚀 РЕЗУЛЬТАТ

Полностью функциональная 6-уровневая система доступа к контенту с:
- **Визуальной дифференциацией** каждого тира
- **Blur эффектами** для недоступного контента
- **Upgrade промптами** для монетизации
- **Комбинированием** типов доступа
- **Оптимизированной** архитектурой 