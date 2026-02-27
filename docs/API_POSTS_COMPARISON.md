# 📊 Сравнительный анализ форматов API

## **Источники данных:**

### 1. `/api/posts` (GET) - Live Database Query
- **Источник**: Prisma ORM → PostgreSQL
- **Обработка**: Полная с проверкой доступа, подписок, покупок
- **Кэш**: Нет

### 2. `/api/posts/explore` (GET) - Static JSON File
- **Источник**: `explore_posts.json` (обновляется раз в сутки)
- **Обработка**: Минимальная (только access mapping)
- **Кэш**: 1 час (HTTP Cache-Control)

---

## 📋 **Сравнение полей постов**

| Поле | `/api/posts` | `/api/posts/explore` | Статус | Критичность |
|------|--------------|----------------------|--------|-------------|
| **Basic Fields** |
| `id` | ✅ | ✅ | OK | ✅ |
| `content` | ✅ | ✅ | OK | ✅ |
| `mediaUrl` | ✅ | ✅ | OK | ✅ |
| `type` | ✅ | ✅ | OK | ✅ |
| `createdAt` | ✅ | ✅ | OK | ✅ |
| `updatedAt` | ✅ | ✅ | OK | ✅ |
| `creatorId` | ✅ | ✅ | OK | ✅ |
| **Access Control** |
| `isLocked` | ✅ | ✅ | OK | ✅ |
| `price` | ✅ | ✅ | OK | ✅ |
| `isPremium` | ✅ | ✅ | OK | ⚠️ |
| `minSubscriptionTier` | ✅ | ✅ | OK | ✅ |
| `currency` | ✅ | ❌ | **MISSING** | ⚠️ |
| **Media Fields** |
| `thumbnail` | ✅ | ❌ | **MISSING** | ⚠️ |
| `blurUrl` | ✅ | ❌ | **MISSING** | ⚠️ |
| `previewUrl` | ✅ | ❌ | **MISSING** | ⚠️ |
| **Post Metadata** |
| `title` | ✅ | ❌ | **MISSING** | ⚠️ |
| `category` | ✅ | ❌ | **MISSING** | ⚠️ |
| `imageAspectRatio` | ✅ | ❌ | **MISSING** | 🔴 |
| `isSellable` | ✅ | ❌ | **MISSING** | ℹ️ |
| **AI Video Fields** |
| `requestId` | ✅ | ❌ | **MISSING** | 🔴 |
| `error` | ✅ | ❌ | **MISSING** | 🔴 |
| `requestStatus` | ✅ | ❌ | **MISSING** | 🔴 |
| `containerId` | ✅ | ❌ | **MISSING** | 🔴 |
| `remixId` | ✅ | ❌ | **MISSING** | ℹ️ |
| **Creator Object** |
| `creator.id` | ✅ | ✅ | OK | ✅ |
| `creator.nickname` | ✅ | ✅ | OK | ✅ |
| `creator.fullName` | ✅ | ✅ | OK | ✅ |
| `creator.avatar` | ✅ | ✅ | OK | ✅ |
| `creator.wallet` | ✅ | ✅ | OK | ✅ |
| `creator.isCreator` | ✅ | ❌ | **MISSING** | ℹ️ |
| `creator.name` | ✅ (computed) | ❌ | **MISSING** | ⚠️ |
| `creator.username` | ✅ (computed) | ❌ | **MISSING** | ⚠️ |
| **Engagement (Counts)** |
| `likesCount` | ✅ | ❌ | Different format | ⚠️ |
| `commentsCount` | ✅ | ❌ | Different format | ⚠️ |
| `viewsCount` | ✅ | ❌ | Different format | ⚠️ |
| `_count.likes` | ❌ | ✅ | Different format | ⚠️ |
| `_count.comments` | ❌ | ✅ | Different format | ⚠️ |
| `_count.purchases` | ❌ | ✅ | Different format | ⚠️ |
| **Access Object (Processed)** |
| `access.*` | ✅ (full) | ⚠️ (partial) | **INCOMPLETE** | 🔴 |
| `access.shouldBlur` | ✅ | ❌ | **MISSING** | 🔴 |
| `access.shouldDim` | ✅ | ❌ | **MISSING** | 🔴 |
| `access.upgradePrompt` | ✅ | ❌ | **MISSING** | ⚠️ |
| `access.accessType` | ✅ | ❌ | **MISSING** | ⚠️ |
| **Media Object (Processed)** |
| `media.type` | ✅ | ❌ | **MISSING** | 🔴 |
| `media.url` | ✅ | ❌ | **MISSING** | 🔴 |
| `media.thumbnail` | ✅ | ❌ | **MISSING** | 🔴 |
| `media.preview` | ✅ | ❌ | **MISSING** | 🔴 |
| `media.error` | ✅ | ❌ | **MISSING** | 🔴 |
| `media.blurUrl` | ✅ | ❌ | **MISSING** | 🔴 |
| **User State** |
| `isSubscribed` | ✅ | ❌ | **MISSING** | 🔴 |
| `hasPurchased` | ✅ | ❌ | **MISSING** | 🔴 |
| `isCreatorPost` | ✅ | ❌ | **MISSING** | 🔴 |
| `hasAccess` | ✅ | ❌ | **MISSING** | 🔴 |
| `shouldHideContent` | ✅ | ❌ | **MISSING** | 🔴 |
| **Advanced Features** |
| `postRemixes` | ✅ | ❌ | **MISSING** | 🔴 |
| `emotions` | ✅ | ❌ | **MISSING** | 🔴 |
| `likes` | ✅ (legacy) | ❌ | **MISSING** | ℹ️ |
| `comments` | ✅ (legacy) | ❌ | **MISSING** | ℹ️ |
| `requiredTier` | ✅ | ❌ | **MISSING** | ⚠️ |
| `userTier` | ✅ | ❌ | **MISSING** | ⚠️ |

---

## 🔴 **КРИТИЧЕСКИЕ ПРОБЛЕМЫ:**

### 1. **Отсутствуют поля для AI-видео**
```javascript
// ❌ MISSING in explore_posts.json:
- requestId       // ID запроса в Sora API
- error           // Ошибка генерации
- requestStatus   // processing/completed/failed
- containerId     // ID контейнера для ремиксов
```
**Проблема:** AI-видео посты не будут работать корректно.

### 2. **Отсутствует media объект**
```javascript
// ❌ MISSING in explore_posts.json:
media: {
  type, url, thumbnail, preview, error, blurUrl
}
```
**Проблема:** Компоненты могут ожидать `post.media.url` вместо `post.mediaUrl`.

### 3. **Отсутствуют поля для визуального контроля доступа**
```javascript
// ❌ MISSING in explore_posts.json:
- shouldBlur      // Нужно ли размывать контент
- shouldDim       // Нужно ли затемнять
- upgradePrompt   // Текст для upgrade подсказки
```
**Проблема:** Не работает визуальная система блокировки контента.

### 4. **Отсутствуют метаданные поста**
```javascript
// ❌ MISSING in explore_posts.json:
- title              // Заголовок (важен для SEO)
- category           // Категория поста
- imageAspectRatio   // Соотношение сторон (критично для layout)
```
**Проблема:** Сломается layout и фильтрация.

### 5. **Отсутствуют ремиксы и эмоции**
```javascript
// ❌ MISSING in explore_posts.json:
- postRemixes[]   // Массив ремиксов
- emotions[]      // Массив эмоций
```
**Проблема:** Не работают расширенные фичи.

---

## ⚠️ **НЕСООТВЕТСТВИЯ В ФОРМАТЕ:**

### Engagement данные
```javascript
// /api/posts возвращает:
{
  likes: 10,           // Legacy integer
  comments: 5,         // Legacy integer  
  likesCount: 10,      // New integer
  commentsCount: 5,    // New integer
  viewsCount: 100      // New integer
}

// /api/posts/explore возвращает:
{
  _count: {
    likes: 10,
    comments: 5,
    purchases: 2
  }
}
```

**Проблема:** Разные ключи для одних данных. Клиент должен адаптироваться.

---

## ✅ **РЕКОМЕНДАЦИИ:**

### 1. **Обновить `export-explore-posts.js`**
Добавить поля:
```javascript
select: {
  // ... existing fields ...
  title: true,
  category: true,
  thumbnail: true,
  blurUrl: true,
  previewUrl: true,
  currency: true,
  imageAspectRatio: true,
  isSellable: true,
  requestId: true,
  error: true,
  remixId: true,
  containerId: true,
  likesCount: true,
  commentsCount: true,
  viewsCount: true
}
```

### 2. **Добавить вычисляемые поля в creator**
```javascript
creator: {
  // ... existing ...
  isCreator: true,
  // После экспорта добавить:
  name: creator.fullName || creator.nickname,
  username: creator.nickname
}
```

### 3. **Адаптировать ExplorePageClient**
```typescript
// Маппинг _count → legacy format
engagement: {
  likes: post._count?.likes || post.likesCount || 0,
  comments: post._count?.comments || post.commentsCount || 0,
  views: post._count?.purchases || post.viewsCount || 0,
  isLiked: false
}

// Добавить media объект
media: {
  type: post.type,
  url: post.mediaUrl,
  thumbnail: post.thumbnail,
  preview: post.previewUrl,
  error: post.error,
  blurUrl: post.blurUrl
}
```

---

## 📊 **ИТОГОВАЯ ОЦЕНКА:**

| Категория | Совпадение | Статус |
|-----------|------------|--------|
| **Basic fields** | 90% | ✅ OK |
| **Access control** | 70% | ⚠️ Partial |
| **Media fields** | 30% | 🔴 Critical |
| **Metadata** | 40% | 🔴 Critical |
| **AI features** | 0% | 🔴 Missing |
| **Engagement** | 100%* | ⚠️ Different format |
| **Creator data** | 85% | ⚠️ Minor gaps |
| **Advanced** | 0% | 🔴 Missing |

**ОБЩИЙ SCORE: 52% / 100%**

---

## 🎯 **ПРИОРИТЕТ ИСПРАВЛЕНИЙ:**

### Критично (🔴):
1. Добавить `title`, `category`, `imageAspectRatio`
2. Добавить `thumbnail`, `blurUrl`, `previewUrl`
3. Добавить `requestId`, `error`, `containerId` (для AI)
4. Добавить `currency`
5. Добавить вычисляемые счётчики (`likesCount`, `commentsCount`, `viewsCount`)

### Важно (⚠️):
1. Добавить `isCreator` в creator
2. Унифицировать формат engagement данных

### Опционально (ℹ️):
1. Добавить `isSellable`, `remixId`
2. Добавить пустые массивы для `postRemixes[]` и `emotions[]`
