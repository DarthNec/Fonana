# 🏗️ ARCHITECTURE CONTEXT: User Profile System

**Дата**: 17 июля 2025  
**ID задачи**: [user_profile_system_discovery_2025_017]  
**Связано с**: DISCOVERY_REPORT.md

## 🎯 АНАЛИЗ ТЕКУЩЕЙ СРЕДЫ

### Компонентная архитектура:

```mermaid
graph TD
    A[/username] --> B[UserProfileShortcutClient]
    B --> C[API /api/user?nickname=]
    C --> D[/creator/id redirect]
    D --> E[CreatorPageClient]
    
    F[/profile] --> G[ProfilePageClient]
    G --> H[Maintenance Mode]
    
    E --> I[No Data Loading]
    
    J[CreatorsExplorer] --> K[getProfileLink]
    K --> A
```

### Поток данных:

```typescript
// Текущий flow
URL /username 
  → UserProfileShortcutClient.fetchUserByNickname()
  → fetch('/api/user?nickname=' + nickname)
  → router.replace('/creator/' + data.user.id)
  → CreatorPageClient (заглушка)

// Целевой flow (missing)
CreatorPageClient 
  → useCreatorData(creatorId) | fetch('/api/creators/' + id)
  → Creator data rendering
  → Profile editing capabilities
```

## 🔧 КЛЮЧЕВЫЕ КОМПОНЕНТЫ

### 1. UserProfileShortcutClient
**Локация**: `components/UserProfileShortcutClient.tsx`  
**Статус**: ✅ Работает корректно  
**Функции**:
- Парсинг username из URL
- Детекция ID vs nickname patterns
- API вызов для получения user data
- Redirect на canonical URL

### 2. CreatorPageClient  
**Локация**: `components/CreatorPageClient.tsx`  
**Статус**: ❌ Только заглушка  
**Проблемы**:
- Нет логики загрузки данных
- Не использует API `/api/creators/{id}`
- Нет интеграции с CreatorContext/Store

### 3. ProfilePageClient
**Локация**: `components/ProfilePageClient.tsx`  
**Статус**: ⚠️ Disabled (infinite loop)  
**Проблемы**:
- useEffect dependencies unstable
- Zustand store integration issues

## 📊 ИНТЕГРАЦИОННЫЕ ТОЧКИ

### Существующие системы:

1. **CreatorContext System**
   ```typescript
   // lib/contexts/CreatorContext.tsx (documented)
   interface CreatorData {
     id: string
     nickname?: string
     fullName?: string
     // ... complete interface
   }
   ```

2. **Zustand AppStore**
   ```typescript
   // lib/store/appStore.ts
   interface Creator {
     id: string
     nickname?: string
     // ... store state
   }
   ```

3. **API Layer**
   ```typescript
   // app/api/creators/[id]/route.ts
   GET /api/creators/{id} → Full creator data
   ```

## 🔗 ЗАВИСИМОСТИ И СВЯЗИ

### Прямые зависимости:
- `useParams` (Next.js routing)
- `useRouter` (Next.js navigation)  
- `fetch` API calls
- `getProfileLink` utility

### Непрямые зависимости:
- CreatorContext (unused)
- AppStore Creator state (unused)
- PostNormalizer service
- Avatar component

### Потенциальные конфликты:
- Multiple state management approaches (Context vs Store)
- URL routing patterns confusion
- Data normalization inconsistencies

## 🎨 ПАТТЕРНЫ И АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### Найденные паттерны:

1. **URL Canonicalization Pattern**
   ```
   /username → /creator/id (SEO + UX)
   ```

2. **Progressive Enhancement Pattern**
   ```
   Shortcut URL → Full URL → Rich Profile
   ```

3. **Context Provider Pattern**  
   ```
   CreatorContext → useCreatorData hook
   ```

### Архитектурные долги:
- CreatorPageClient не использует установленные паттерны
- ProfilePageClient имеет dependency cycle
- Дублирование логики между Context и Store

## 📈 ПРОИЗВОДИТЕЛЬНОСТЬ И МАСШТАБИРУЕМОСТЬ

### Текущие метрики:
- UserProfileShortcutClient: ~200ms redirect time
- API `/api/user?nickname=`: работает стабильно
- API `/api/creators/{id}`: не используется в UI

### Узкие места:
- Двойной API вызов (nickname lookup + creator fetch)
- Отсутствие кэширования creator data
- Нет lazy loading для profile components

### Возможности оптимизации:
- Unified API endpoint: `/api/profiles/{username}`
- Creator data caching в Context/Store
- Component lazy loading

## 🔒 БЕЗОПАСНОСТЬ И ДОСТУПЫ

### Текущие проверки:
- Nickname validation в UserProfileShortcutClient
- Static file filtering (sw.js, manifest.json)
- CUID pattern detection

### Потенциальные уязвимости:
- Нет rate limiting на profile lookups
- Отсутствие validation creator data
- Нет error boundaries для profile components

## 🎯 ЧЕКЛИСТ АНАЛИЗА

- [x] Все компоненты проанализированы?
- [x] Поток данных документирован?
- [x] Зависимости выявлены?
- [x] Конфликты идентифицированы?
- [x] Паттерны извлечены?
- [x] Производительность оценена?
- [x] Безопасность проверена?

## 📋 ВЫВОДЫ

### Ключевые находки:
1. **UserProfileShortcutClient работает отлично** - нет нужды в изменениях
2. **CreatorPageClient нуждается в полной реализации** - основная задача
3. **ProfilePageClient требует debugging** - infinite loop issue
4. **Существует готовая инфраструктура** - CreatorContext + API

### Стратегия решения:
**Приоритет 1**: Восстановить CreatorPageClient с использованием `/api/creators/{id}`  
**Приоритет 2**: Исправить ProfilePageClient infinite loop  
**Приоритет 3**: Интегрировать с CreatorContext для consistency

**Статус**: Architecture Context завершен ✅  
**Переход к**: SOLUTION_PLAN.md 