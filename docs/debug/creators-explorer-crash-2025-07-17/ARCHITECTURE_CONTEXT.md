# ARCHITECTURE CONTEXT - CreatorsExplorer Crash
## Дата: 2025-07-17

### 1. Архитектурные компоненты

#### CreatorsExplorer Component
- **Путь**: `components/CreatorsExplorer.tsx`
- **Назначение**: Отображение списка креаторов с фильтрацией и подписками
- **Зависимости**: 
  - Next.js Link, Image
  - React hooks (useState, useEffect, useMemo)
  - appStore (Zustand)
  - Lucide React icons

#### API /creators
- **Путь**: `app/api/creators/route.ts`
- **Назначение**: Возвращает список креаторов из БД
- **Ответ**:
  ```json
  {
    "totalCount": 52,
    "creators": [{
      "id": string,
      "nickname": string,
      "fullName": string,
      "bio": string,
      "avatar": string | null,
      "backgroundImage": string | null,
      "name": string,
      "postsCount": number,
      "followersCount": number,
      "createdAt": string
    }]
  }
  ```

### 2. Несоответствие типов

#### Ожидаемый интерфейс Creator (в компоненте)
```typescript
interface Creator {
  id: string
  name: string
  username: string        // ❌ НЕТ в API
  description: string     // ❌ НЕТ в API
  avatar: string | null
  backgroundImage?: string | null
  coverImage: string      // ❌ НЕТ в API
  isVerified: boolean
  subscribers: number     // ❌ НЕТ в API
  posts: number          // ⚠️ В API это postsCount
  tags: string[]         // ❌ НЕТ в API
  monthlyEarnings: string // ❌ НЕТ в API
  createdAt: string
}
```

#### Фактические данные из API
```typescript
{
  id: string
  nickname: string        // ⚠️ Не используется в компоненте
  fullName: string       // ⚠️ Не используется в компоненте
  bio: string           // ⚠️ Не используется в компоненте
  avatar: string | null
  backgroundImage: string | null
  name: string          // ✅ Есть (возможно fullName || nickname)
  postsCount: number    // ⚠️ Имя отличается от ожидаемого
  followersCount: number // ⚠️ Не используется в компоненте
  createdAt: string
}
```

### 3. Критические точки сбоя

1. **Строка 306**: `creator.tags.length`
   - Обращение к несуществующему полю tags
   - Нет проверки на undefined

2. **Строка 288**: `creator.subscribers.toLocaleString()`
   - Обращение к несуществующему полю subscribers
   - Вызов метода на undefined

3. **Строка 269**: `seed={creator.username}`
   - Использование несуществующего поля username

4. **Строка 285**: `@{creator.username}`
   - Отображение несуществующего username

### 4. Поток данных

```
1. Компонент монтируется
2. useEffect вызывает fetchCreators()
3. Fetch к /api/creators
4. API возвращает данные из БД (без tags, subscribers, username)
5. setCreators() устанавливает данные в state
6. Render пытается отобразить creator.tags.length
7. CRASH: Cannot read properties of undefined
```

### 5. State Management

- **appStore**: Zustand store для глобального состояния
- **Local state**: 
  - `creators: Creator[]` - список креаторов
  - `subscribedCreatorIds: string[]` - ID подписок
  - `loading: boolean` - состояние загрузки
  - `error: string | null` - ошибки

### 6. Зависимые системы

1. **Avatar компонент** - использует `seed` prop (ожидает username)
2. **ErrorBoundary** - ловит ошибки и показывает fallback UI
3. **WebSocket** - пытается подключиться для real-time обновлений

### 7. Архитектурные проблемы

1. **Type Safety**: TypeScript не предотвращает runtime ошибки из-за неправильных типов
2. **API Contract**: Нет валидации данных от API
3. **Defensive Programming**: Отсутствуют проверки на undefined
4. **Schema Mismatch**: Prisma схема != TypeScript типы != Фактические данные

### 8. Влияние на другие компоненты

- **HomePageClient**: Использует CreatorsExplorer, также крашится
- **CreatorCard**: Возможно имеет похожие проблемы
- **Search**: Может искать по несуществующим полям 