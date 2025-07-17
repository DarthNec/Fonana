# 🏗️ ARCHITECTURE CONTEXT: Database Migration Analysis

**Дата**: 2025-01-16
**Задача**: Анализ текущей архитектуры для импорта данных Supabase
**Методология**: IDEAL_METHODOLOGY.md

## 🎯 Цель анализа

Проанализировать текущую архитектуру системы, компоненты загрузки данных и их взаимосвязи для безопасного импорта дампа Supabase.

## 📐 Архитектура системы

### Backend API Architecture

#### 1. Database Layer
- **ORM**: Prisma 5.22.0
- **Provider**: PostgreSQL 
- **Database**: `fonana_dev` (локальная)
- **Connection**: `postgresql://postgres:postgres@localhost:5432/fonana_dev`
- **Schema**: `/prisma/schema.prisma` (актуальная, синхронизирована)

#### 2. API Endpoints для данных
```
GET /api/creators
├── Фильтрация по категориям
├── Включает: posts, followers count, subscribers count
└── Поддержка пагинации

GET /api/posts  
├── Параметры: creatorId, category, page, limit, sortBy
├── Включает: creator, tags, likes/comments count
├── Логика доступа (премиум контент)
└── Поддержка сортировки (latest, popular, trending)

GET /api/posts/following
├── Только посты от подписок пользователя
├── Требует userWallet parameter
└── Фильтрация по активным подпискам
```

#### 3. Data Models (Prisma Schema)
```prisma
User (ID, nickname, fullName, wallet, isCreator, ...)
Post (ID, title, content, creatorId, type, mediaUrl, ...)
Comment (ID, content, postId, userId, ...)
Subscription (ID, userId, creatorId, isActive, ...)
Like (userId, postId, unique constraint)
```

### Frontend Architecture

#### 1. State Management
- **Store**: Zustand (`lib/store/appStore.ts`)
- **Slices**: User, Creator, Notifications
- **Persistence**: LocalStorage для некоторых данных

#### 2. Data Loading Hooks
```typescript
// Основные хуки загрузки данных
useOptimizedPosts() - пагинация, кеширование, debouncing
useUnifiedPosts() - унифицированная загрузка постов
useUser() - текущий пользователь из Zustand store
```

#### 3. Page Components
```typescript
// Страницы, которые нужно будет протестировать
CreatorsExplorer.tsx (/creators)
├── fetchCreators() -> GET /api/creators
├── Фильтрация по категориям
└── Отображение ошибок загрузки

FeedPageClient.tsx (/feed)  
├── useOptimizedPosts() -> GET /api/posts
├── Сортировка (latest, popular, trending)
└── Infinite scroll пагинация
```

## 🔗 Data Flow Analysis

### Creators Page Flow:
```
1. User visits /creators
2. CreatorsExplorer.tsx mounts
3. useEffect() -> fetchCreators()
4. GET /api/creators
5. Prisma query: User.findMany({ isCreator: true })
6. Response: creators array + subscribers count
7. setState(creators) -> UI update
```

### Feed Page Flow:
```
1. User visits /feed
2. FeedPageClient.tsx mounts  
3. useOptimizedPosts() hook
4. GET /api/posts?page=1&limit=20
5. Prisma query: Post.findMany() + includes
6. Access control logic applied
7. Response: posts array + totalCount
8. setState(posts) -> UI update
```

## 🗂️ Текущее состояние данных

### Database Status:
- ✅ Schema применена (все таблицы созданы)
- ❓ Users count: [PENDING CHECK]
- ❓ Posts count: [PENDING CHECK]
- ❓ Other data: [PENDING CHECK]

### Expected Import Impact:
```sql
-- Данные которые будут импортированы:
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE posts CASCADE;  
TRUNCATE TABLE users CASCADE;

-- 10 пользователей с полями:
id, nickname, fullName, wallet, createdAt, updatedAt

-- 10 постов с полями:
id, title, type, creatorId, createdAt, updatedAt
```

## 🔄 Integration Points

### 1. API Compatibility 
- **User model mapping**: nickname ✓, fullName ✓, wallet ✓, isCreator ⚠️
- **Post model mapping**: title ✓, type ✓, creatorId ✓, content ⚠️
- **Missing fields**: isCreator flag for users, content for posts

### 2. Frontend Dependencies
- **Zustand Store**: Не зависит от конкретных данных
- **API Responses**: Ожидает определенный формат ответов
- **Error Handling**: Готов к обработке пустых массивов

### 3. Business Logic
- **Creator Detection**: API проверяет `isCreator: true`
- **Post Access**: Логика премиум контента и подписок
- **User Authentication**: Wallet-based система

## ⚠️ Потенциальные конфликты

### Schema Level:
1. **User.isCreator**: Дамп не содержит это поле (по умолчанию false)
2. **Post.content**: Дамп не содержит content поле
3. **Missing Relations**: Комментарии, лайки, подписки

### API Level:  
1. **Creator filtering**: Если isCreator=false, пользователи не появятся в /api/creators
2. **Post content**: Отсутствие content может влиять на отображение
3. **Media URLs**: Пути к файлам могут не существовать

### Frontend Level:
1. **Empty states**: UI готов к отображению "No data" states
2. **Loading states**: Корректно обрабатывают процесс загрузки
3. **Error handling**: Показывают ошибки пользователю

## 🔧 Dependencies & Versions

### Critical Dependencies:
```json
"@prisma/client": "5.22.0"
"prisma": "5.22.0"  
"next": "14.x"
"zustand": "latest"
```

### Environment Variables:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fonana_dev"
# Другие переменные из .env
```

## 🎯 Готовность к миграции

### ✅ Готово:
- Database schema синхронизирована
- API endpoints функционируют
- Frontend components готовы к обработке данных
- Error handling реализован

### ⚠️ Требует внимания:
- isCreator flag для импортированных пользователей
- Post.content поле для корректного отображения
- Проверка медиа файлов

### 🔄 Post-Migration Tasks:
- UPDATE users SET isCreator = true WHERE id IN (creator_ids)
- Тестирование /creators и /feed страниц
- Проверка корректности отображения данных

## 📋 Следующие шаги

1. ✅ ARCHITECTURE_CONTEXT.md завершен
2. ⏳ Создать SOLUTION_PLAN.md v1
3. ⏳ Создать IMPACT_ANALYSIS.md v1
4. ⏳ Начать итеративный цикл оптимизации 