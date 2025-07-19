# DISCOVERY_REPORT: Tier Access Logic Issue
## ID: [tier_access_logic_fix_2025_017]
### Дата: 2025-01-17

## 1. ОПИСАНИЕ ПРОБЛЕМЫ

Пользователь сообщил, что видит посты других пользователей блеклыми (размытыми), хотя ожидается иерархическая система доступа:
- **Free** - видит только free контент
- **Basic** - видит free + basic
- **Premium** - видит free + basic + premium  
- **VIP** - видит все тиры

## 2. АНАЛИЗ ЧЕРЕЗ PLAYWRIGHT MCP

### Текущее поведение
При навигации на /feed без авторизации:
- Посты с тирами (Basic, Premium, VIP) отображаются по-разному
- Некоторые размыты с промптами апгрейда ✅ (правильно)
- Некоторые полностью доступны ❌ (неправильно)

### API Response Analysis
```json
// Пост с isLocked: true + minSubscriptionTier: "vip"
{
  "hasAccess": false,
  "shouldBlur": true  // ✅ Правильно
}

// Пост с isLocked: false + minSubscriptionTier: "vip"  
{
  "hasAccess": true,
  "shouldBlur": false  // ❌ Неправильно!
}
```

## 3. КОРНЕВАЯ ПРИЧИНА

В функции `checkPostAccess` (lib/utils/access.ts:89-96):
```typescript
// Если контент не заблокирован
if (!post.isLocked) {
  return {
    hasAccess: true,  // ❌ Игнорирует minSubscriptionTier!
    shouldBlur: false,
    // ...
  }
}
```

Логика проверяет `isLocked` ДО проверки `minSubscriptionTier`, что приводит к игнорированию требований тира.

## 4. ВЛИЯНИЕ

- Контент с тирами но без `isLocked` доступен всем
- Нарушается бизнес-логика монетизации
- Создатели не могут корректно ограничивать доступ по тирам

## 5. ПРЕДЛАГАЕМОЕ РЕШЕНИЕ

Изменить порядок проверок в `checkPostAccess`:
1. Сначала проверять автора (author always has access)
2. Затем проверять тиры (tier requirements)
3. Потом платный контент (paid content)
4. И только в конце - общую блокировку (isLocked)

Это обеспечит правильную иерархию доступа согласно требованиям. 