# 🏗️ АРХИТЕКТУРНЫЙ КОНТЕКСТ - Полная система доступа к контенту
**ID**: [content_access_system_2025_017]  
**Дата**: 17.07.2025  
**Методология**: M7

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### ✅ Что уже работает:
1. **4-tier система подписок** (Free/Basic/Premium/VIP)
   - Иерархия доступа реализована
   - Автор всегда видит свой контент
   - UI компоненты (TierBadge, PostTierBadge)
   - Стили и константы (tier-styles.ts)

2. **Платные посты** (Paid posts)
   - Единоразовая оплата за доступ к контенту
   - Используют поле `price` для стоимости доступа
   - Создают запись PostPurchase при покупке

3. **Sellable посты** (товары)
   - Продажа физических/цифровых товаров
   - Не влияют на доступ к контенту
   - Помечаются как проданные после покупки

### ❌ Что НЕ работает полностью:
1. **Визуальная дифференциация** тиров в ленте
   - Рамки и фоновые градиенты для тиров
   - Blur эффект для недоступного контента
   - Сообщения с предложением апгрейда

2. **Комбинирование типов доступа**
   - Sellable + tier-based контент
   - Правильное отображение статусов

3. **UI индикаторы в карточках**
   - Бейджи тиров с правильными стилями
   - Индикаторы "SOLD" для проданных товаров
   - Различие между paid и sellable постами

## 🔍 АНАЛИЗ СУЩЕСТВУЮЩЕГО КОДА

### Найденные компоненты:
1. **lib/constants/tier-styles.ts** - визуальные константы
   ```typescript
   TIER_VISUAL_DETAILS: {
     free: { gradient, border, text, dot }
     basic: { gradient, border, text, dot }
     premium: { gradient, border, text, dot }
     vip: { gradient, border, text, dot }
   }
   ```

2. **components/posts/utils/postHelpers.ts** - функции стилизации
   - `getPostCardBackgroundStyle()` - фоновые градиенты
   - `getPostCardBorderStyle()` - стили границ
   - `getPostCardGlowStyle()` - эффекты свечения

3. **lib/utils/access.ts** - проверка доступа
   - `checkPostAccess()` - основная логика доступа
   - `hasAccessToTier()` - проверка иерархии тиров

### Обнаруженные проблемы:

1. **Смешение концепций в БД**:
   ```prisma
   price Float?  // Используется И для paid posts И для sellable
   isLocked Boolean  // Дублирует логику с minSubscriptionTier
   isPremium Boolean  // Legacy поле
   ```

2. **Неполная типизация**:
   - Отсутствует единый enum для типов доступа
   - Нет четкого разделения между access и commerce

3. **UI не использует все возможности**:
   - PostCard не применяет все стили из tier-styles
   - Нет blur эффекта для заблокированного контента
   - Отсутствуют upgrade промпты

## 🎯 ЦЕЛИ ВОССТАНОВЛЕНИЯ

### 1. Визуальная система:
- **Рамки тиров**: каждый тир имеет свой цвет границы
- **Фоновые градиенты**: subtle подсветка по тиру
- **Blur эффект**: размытие недоступного контента
- **Upgrade промпты**: "Upgrade to Premium to unlock"

### 2. Функциональная система:
- **6 типов доступа**: Free, Basic, Premium, VIP, Paid, Sellable
- **Комбинирование**: Sellable + любой тип доступа
- **Правильная иерархия**: высшие тиры видят низшие

### 3. Оптимизация:
- **Единая система типов**: четкие enums и interfaces
- **Переиспользование стилей**: из tier-styles.ts
- **Минимальные изменения БД**: использовать существующие поля

## 📐 АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### 1. Типизация системы:
```typescript
enum PostAccessType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium', 
  VIP = 'vip',
  PAID = 'paid'
}

interface PostAccess {
  type: PostAccessType
  tier?: TierName
  price?: number
  hasAccess: boolean
  isCreatorPost: boolean
  shouldBlur: boolean
  upgradePrompt?: string
}
```

### 2. Визуальная система:
- Использовать TIER_VISUAL_DETAILS для всех UI элементов
- Применить blur через CSS backdrop-filter
- Добавить upgrade промпты в PostCard

### 3. Логика доступа:
- Расширить checkPostAccess() для всех 6 типов
- Добавить shouldBlur флаг
- Генерировать upgradePrompt сообщения

## 🚀 ПЛАН ВНЕДРЕНИЯ

### Phase 1: Типизация и константы (15 мин)
- Создать единые типы и enums
- Расширить tier-styles с blur эффектами
- Добавить upgrade промпты

### Phase 2: Логика доступа (20 мин)
- Обновить checkPostAccess для 6 типов
- Добавить shouldBlur логику
- Интегрировать с PostCard

### Phase 3: UI компоненты (25 мин)
- Применить стили из tier-styles
- Добавить blur эффект
- Показывать upgrade промпты
- Индикатор SOLD для sellable

### Phase 4: Тестирование (10 мин)
- Создать посты всех типов
- Проверить визуальную дифференциацию
- Валидировать логику доступа

**Общее время**: ~1 час 10 минут 