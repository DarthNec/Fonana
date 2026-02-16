# 🔍 DISCOVERY REPORT: AI Users Activity Bot

**M7 Session ID:** `task_создать-pm2-скрипт-для-автомат_7683`  
**Дата:** 29 января 2026  
**Статус:** ✅ ANALYSIS COMPLETE

---

## 📋 Задача

Создать скрипт для автоматической активности AI пользователей:
- **Запуск:** Через PM2 с определённой периодичностью
- **Источник пользователей:** `ai-chat-users.json` (25 пользователей)
- **Активность за 1 проход:**
  - 1 случайный пользователь
  - 1 реакция на случайный пост (если ещё не ставил)
  - **🧠 1 комментарий через OpenAI GPT-3.5-turbo (обязательно!)**
- **Код:** Только анализ, изменения не вносим

**🚨 КРИТИЧЕСКИ ВАЖНО:** Комментарии генерируются ТОЛЬКО через OpenAI! Анализ title + content поста!

---

## 🔬 Анализ текущей системы

### 1. AI Users Structure

**Файл:** `ai-chat-users.json`

**Структура:**
```json
[
  {
    "id": "cmkdu5ckz00004ai2lfevizno",
    "nickname": "EpicKnight137",
    "avatar": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=EpicKnight137",
    "wallet": "5GEmrRcxuDNWpREXRfXZAg5RuEKR7c7ZB8qHjRphAx6U"
  }
]
```

**Метрики:**
- Всего пользователей: 25
- Поля: `id`, `nickname`, `avatar`, `wallet`

**Использование:**
- ✅ Уже используется в `ai-chat-bot.js` для генерации сообщений
- ✅ Пользователи реально существуют в базе данных

---

### 2. Существующий AI Bot

**Файл:** `ai-chat-bot.js`

**Что умеет:**
- Загружает AI users из `ai-chat-users.json`
- Генерирует сообщения в чат через OpenAI
- Использует Prisma для работы с БД
- Запускается через PM2

**Полезные функции:**
```javascript
// Загрузка AI пользователей
function loadAiUsers() {
  aiUsers = JSON.parse(fs.readFileSync(AI_USERS_FILE, 'utf8'))
}

// Получить случайного пользователя
function getRandomAiUser() {
  return aiUsers[Math.floor(Math.random() * aiUsers.length)]
}

// OpenAI integration
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
})
```

**Паттерн:** Можем переиспользовать структуру и подходы

---

### 3. API Endpoints Analysis

#### ✅ Emotions API (Реакции)

**Endpoint:** `POST /api/posts/[id]/emotions`

**Request:**
```json
{
  "userId": "string",
  "emotionId": number (1-6)
}
```

**Логика:**
- Проверяет существование поста
- Проверяет existing emotions пользователя
- Если emotionId совпадает → удаляет
- Если другой emotionId → заменяет
- Если новый → создаёт

**Эмоции (1-6):**
1. ❤️ Like
2. 😂 Haha
3. 😮 Wow
4. 😢 Sad
5. 😡 Angry
6. 🔥 Fire

**Важно:** Система поддерживает **множественные эмоции** на один пост!

---

#### ✅ Comments API

**Endpoint:** `POST /api/posts/[id]/comments`

**Request:**
```json
{
  "userId": "string",
  "content": "string",
  "parentId": "string" (optional),
  "isAnonymous": false
}
```

**Логика:**
- Проверяет существование поста
- Создаёт комментарий
- Увеличивает `commentsCount` в посте
- Отправляет WebSocket уведомления
- Создаёт notification для автора

**Features:**
- Поддержка replies (parentId)
- Анонимные комментарии
- Полная интеграция с уведомлениями

---

#### ✅ Posts API

**Endpoint:** `GET /api/posts`

**Response:**
```json
{
  "posts": [
    {
      "id": "string",
      "title": "string",
      "creatorId": "string",
      "type": "text|image|video|audio",
      "category": "string",
      "isLocked": boolean,
      ...
    }
  ]
}
```

**Фильтрация:**
- Query params: `userId`, `category`, `type`, etc.
- Orderby: `createdAt DESC`

---

### 4. Database Schema

#### Model: Emotion
```prisma
model Emotion {
  id         String   @id @default(cuid())
  userId     String
  postId     String?
  commentId  String?
  emotionId  Int      // 1-6
  createdAt  DateTime @default(now())
  
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post       Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment    Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
}
```

**Ключевые моменты:**
- Поддержка emotions на посты И комментарии
- Нет unique constraint на `userId_postId` → можно несколько эмоций!
- Cascade delete при удалении поста/комментария

---

#### Model: Comment
```prisma
model Comment {
  id          String    @id @default(cuid())
  postId      String
  userId      String
  content     String
  isAnonymous Boolean   @default(false)
  likesCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  parentId    String?
  
  post        Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies     Comment[] @relation("CommentReplies")
  emotions    Emotion[]
}
```

**Ключевые моменты:**
- Поддержка вложенных комментариев (parentId)
- Анонимные комментарии
- Связь с Emotion модель

---

## 🎯 Архитектура скрипта

### Основной флоу:

```
START
  ↓
Load AI Users from JSON
  ↓
Select Random User
  ↓
Fetch Last 80 Posts (🔥 актуальные, не супер старые!)
  ↓
Select Random Post from 80
  ↓
Check if User has Emotion on Post
  ↓
[NO] → Add Random Emotion (1-6)
  ↓
🧠 Generate Comment via OpenAI (ОБЯЗАТЕЛЬНО!)
  ↓
Post Comment to API
  ↓
Log Activity
  ↓
END
```

### Компоненты:

#### 1. User Selection
```javascript
function getRandomAiUser() {
  return aiUsers[Math.floor(Math.random() * aiUsers.length)]
}
```

#### 2. Post Selection (последние 80 постов!)
```javascript
async function getRandomPost(excludeCreatorId) {
  const posts = await prisma.post.findMany({
    where: {
      creatorId: { not: excludeCreatorId } // Не свои посты
    },
    take: 80, // 🔥 Последние 80 постов (актуальные!)
    orderBy: { createdAt: 'desc' } // Сначала новые
  })
  return posts[Math.floor(Math.random() * posts.length)]
}
```

**Важно:** 
- Берём **последние 80 постов** (не супер старые!)
- Из них выбираем случайный
- Гарантируем актуальность контента

#### 3. Emotion Check
```javascript
async function hasEmotion(userId, postId) {
  const emotions = await prisma.emotion.findMany({
    where: { userId, postId }
  })
  return emotions.length > 0
}
```

#### 4. Add Emotion
```javascript
async function addEmotion(userId, postId) {
  const emotionId = Math.floor(Math.random() * 6) + 1 // 1-6
  
  await fetch(`/api/posts/${postId}/emotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, emotionId })
  })
}
```

#### 5. Generate Comment (OpenAI) - 🧠 SMART ANALYSIS
```javascript
async function generateComment(post, user) {
  // 🧠 SMART: Анализируем title И content (description)!
  const postTitle = post.title || 'Пост без названия'
  const postContent = post.content ? post.content.slice(0, 200) : ''
  
  const prompt = `Ты активный пользователь соцсети Fonana.
Твой ник: ${user.nickname}

ПОСТ, КОТОРЫЙ ТЫ ВИДИШЬ:
Название: "${postTitle}"
${postContent ? `Описание: "${postContent}"` : ''}
Тип: ${post.type}

ЗАДАЧА:
Прочитай название и описание. Напиши КОРОТКИЙ комментарий, который:
1. РЕАГИРУЕТ на СОДЕРЖАНИЕ (не просто "круто")
2. Показывает, что ты ПОНЯЛ о чём пост
3. Звучит естественно

ТРЕБОВАНИЯ:
- Длина: 1-2 предложения (max 60 символов)
- Стиль: школьный сленг
- Добавь 1-2 эмодзи
- Реагируй на СМЫСЛ, не на формальные данные!

Примеры:
Пост про путешествие → "воу, куда поехал? круто 😍"
Пост про еду → "аппетитно выглядит, рецепт дай 🤤"
Пост про музыку → "трек огонь, в плейлист добавил 🔥"

Пиши ТОЛЬКО комментарий.`
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 80, // Увеличено для контекстных комментариев
    temperature: 0.9
  })
  
  return response.choices[0].message.content
    .trim()
    .replace(/^["']|["']$/g, '') // Убираем кавычки
    .slice(0, 100) // Максимум 100 символов
}
```

#### 6. Post Comment
```javascript
async function postComment(userId, postId, content) {
  await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      content,
      isAnonymous: false
    })
  })
}
```

---

## 📝 Необходимые файлы

### Новые файлы:

#### 1. `ai-activity-bot.js`
**Назначение:** Основной скрипт активности  
**Содержит:**
- Load AI users
- Random selection logic
- Emotion & comment creation
- OpenAI integration
- Error handling & logging

**Аналог:** `ai-chat-bot.js` (можно переиспользовать структуру)

---

#### 2. `ecosystem.config.js` (обновление)
**Назначение:** PM2 конфигурация  
**Изменения:**
- Добавить новое app для `ai-activity-bot.js`
- Настроить cron для периодического запуска

**Пример:**
```javascript
module.exports = {
  apps: [
    {
      name: 'ai-chat-bot',
      script: './ai-chat-bot.js',
      // existing config
    },
    {
      name: 'ai-activity-bot',
      script: './ai-activity-bot.js',
      cron_restart: '*/15 * * * *', // Каждые 15 минут
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY
      }
    }
  ]
}
```

---

#### 3. `.env` (проверка)
**Убедиться что есть:**
- `DATABASE_URL`
- `NEXT_PUBLIC_OPENAI_API_KEY`

---

### Изменяемые файлы:

#### НЕТ!
- **API endpoints:** Уже готовы, изменения не нужны
- **Database schema:** Поддерживает всё необходимое
- **ai-chat-users.json:** Не меняется

---

## 🎨 Предварительный код скрипта

```javascript
/**
 * AI Activity Bot - автоматическая активность AI пользователей
 * Запускается через PM2, выполняет один проход активности
 * - Выбирает случайного AI пользователя
 * - Ставит реакцию на случайный пост (если не ставил)
 * - Оставляет комментарий на случайный пост
 */

const { PrismaClient } = require('@prisma/client')
const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Путь к файлу со списком AI пользователей
const AI_USERS_FILE = path.join(__dirname, 'ai-chat-users.json')

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
})

// Загружаем AI пользователей
let aiUsers = []
function loadAiUsers() {
  try {
    if (fs.existsSync(AI_USERS_FILE)) {
      aiUsers = JSON.parse(fs.readFileSync(AI_USERS_FILE, 'utf8'))
      console.log(`[AI Activity Bot] Loaded ${aiUsers.length} AI users`)
    } else {
      console.error('[AI Activity Bot] AI users file not found!')
      process.exit(1)
    }
  } catch (error) {
    console.error('[AI Activity Bot] Failed to load AI users:', error)
    process.exit(1)
  }
}

// Получаем рандомного AI пользователя
function getRandomAiUser() {
  return aiUsers[Math.floor(Math.random() * aiUsers.length)]
}

// Получаем рандомный пост из последних 80 (не супер старые!)
async function getRandomPost(excludeUserId) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        creatorId: { not: excludeUserId },
        // Только публичные или доступные посты
        OR: [
          { isLocked: false },
          { isPremium: false }
        ]
      },
      take: 80, // 🔥 Последние 80 постов (актуальные!)
      orderBy: { createdAt: 'desc' } // Сначала новые, супер старые не берём
    })
    
    if (posts.length === 0) {
      console.log('[AI Activity Bot] No available posts found')
      return null
    }
    
    // Случайный выбор из последних 80
    return posts[Math.floor(Math.random() * posts.length)]
  } catch (error) {
    console.error('[AI Activity Bot] Error fetching posts:', error)
    return null
  }
}

// Проверяем есть ли уже эмоция на посту
async function hasEmotion(userId, postId) {
  try {
    const emotions = await prisma.emotion.findMany({
      where: {
        userId,
        postId
      }
    })
    return emotions.length > 0
  } catch (error) {
    console.error('[AI Activity Bot] Error checking emotions:', error)
    return false
  }
}

// Добавляем случайную эмоцию
async function addRandomEmotion(userId, postId) {
  try {
    const emotionId = Math.floor(Math.random() * 6) + 1 // 1-6
    
    await prisma.emotion.create({
      data: {
        userId,
        postId,
        emotionId
      }
    })
    
    const emotionNames = {
      1: '❤️ Like',
      2: '😂 Haha',
      3: '😮 Wow',
      4: '😢 Sad',
      5: '😡 Angry',
      6: '🔥 Fire'
    }
    
    console.log(`[AI Activity Bot] Added emotion: ${emotionNames[emotionId]}`)
    return true
  } catch (error) {
    console.error('[AI Activity Bot] Error adding emotion:', error)
    return false
  }
}

// Генерируем комментарий через OpenAI - 🧠 SMART ANALYSIS
async function generateComment(post, user) {
  try {
    // 🧠 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Анализируем title И content (description)!
    const postTitle = post.title || 'Пост без названия'
    const postContent = post.content ? post.content.slice(0, 200) : ''
    const postType = post.type || 'text'
    const postCategory = post.category || ''
    
    const prompt = `Ты активный пользователь соцсети Fonana.
Твой ник: ${user.nickname}
Твой стиль: дружеский, непринуждённый, школьный сленг.

ПОСТ, КОТОРЫЙ ТЫ ВИДИШЬ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Название: "${postTitle}"
${postContent ? `Описание: "${postContent}"` : ''}
Тип контента: ${postType}
${postCategory ? `Категория: ${postCategory}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ЗАДАЧА:
Прочитай название и описание поста. Напиши КОРОТКИЙ комментарий, который:
1. РЕАГИРУЕТ на СОДЕРЖАНИЕ поста (не просто "круто")
2. Показывает, что ты ПОНЯЛ о чём пост
3. Звучит естественно и по-дружески

ТРЕБОВАНИЯ:
- Длина: 1-2 коротких предложения (максимум 60 символов)
- Стиль: школьный сленг, непринуждённый
- Добавь 1-2 подходящих эмодзи
- Реагируй на СМЫСЛ поста, не на формальные данные
- Не упоминай категорию или тип - пиши про содержание!

ПРИМЕРЫ ХОРОШИХ КОММЕНТАРИЕВ:
Пост про путешествие → "воу, куда поехал? круто 😍"
Пост про еду → "аппетитно выглядит, рецепт дай 🤤"
Пост про музыку → "трек огонь, в плейлист добавил 🔥"
Пост про мем → "ахахах орнул 😂😂"
Пост про спорт → "техника топ, сколько тренишься? 💪"
Пост про искусство → "детали прям вау 🎨"

Пиши ТОЛЬКО комментарий, без кавычек и пояснений.`
    
    console.log('[AI Activity Bot] 🧠 Generating SMART comment with context:', {
      title: postTitle.slice(0, 50),
      contentLength: postContent.length,
      type: postType
    })
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 80, // Увеличено для контекстных комментариев
      temperature: 0.9 // Высокая вариативность
    })
    
    const comment = response.choices[0].message.content
      .trim()
      .replace(/^["']|["']$/g, '') // Убираем кавычки если есть
      .slice(0, 100) // Максимум 100 символов
    
    console.log(`[AI Activity Bot] ✅ SMART comment generated: "${comment}"`)
    return comment
    
  } catch (error) {
    console.error('[AI Activity Bot] ⚠️ OpenAI error, using type-based fallback:', error.message)
    
    // Fallback: генерируем на основе ТИПА поста (НЕ generic фразы!)
    const typeBasedComments = {
      image: ['круто получилось 📸', 'огонь картинка 🔥', 'красиво выглядит 👍'],
      video: ['видос топ 🎬', 'залип посмотрел 👀', 'монтаж огонь 🔥'],
      audio: ['трек качает 🎵', 'музон топ 🔥', 'в плейлист добавил 🎶'],
      text: ['интересно написано 📝', 'мысль топ 💭', 'согласен полностью 👍']
    }
    
    const fallbackArray = typeBasedComments[post.type] || [
      'круто 🔥',
      'топчик 👍',
      'вау 😮',
      'интересно 🤔'
    ]
    
    return fallbackArray[Math.floor(Math.random() * fallbackArray.length)]
  }
}

// Создаём комментарий
async function createComment(userId, postId, content) {
  try {
    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
        content,
        isAnonymous: false
      }
    })
    
    // Увеличиваем счётчик комментариев
    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } }
    })
    
    console.log(`[AI Activity Bot] Comment created: ${comment.id}`)
    return true
  } catch (error) {
    console.error('[AI Activity Bot] Error creating comment:', error)
    return false
  }
}

// Основная функция
async function runActivityCycle() {
  console.log('\\n========================================')
  console.log('[AI Activity Bot] Starting activity cycle...')
  console.log('========================================\\n')
  
  try {
    // 1. Выбираем случайного AI пользователя
    const user = getRandomAiUser()
    console.log(`[AI Activity Bot] Selected user: ${user.nickname} (${user.id})`)
    
    // 2. Получаем случайный пост (не свой)
    const post = await getRandomPost(user.id)
    if (!post) {
      console.log('[AI Activity Bot] No posts available, skipping cycle')
      return
    }
    console.log(`[AI Activity Bot] Selected post: "${post.title}" by ${post.creatorId}`)
    
    // 3. Проверяем и добавляем эмоцию
    const hasEmotionOnPost = await hasEmotion(user.id, post.id)
    if (!hasEmotionOnPost) {
      console.log('[AI Activity Bot] Adding emotion...')
      await addRandomEmotion(user.id, post.id)
    } else {
      console.log('[AI Activity Bot] User already has emotion on this post, skipping...')
    }
    
    // 4. Генерируем и создаём комментарий
    console.log('[AI Activity Bot] Generating comment...')
    const commentText = await generateComment(post, user)
    
    console.log('[AI Activity Bot] Creating comment...')
    await createComment(user.id, post.id, commentText)
    
    console.log('\\n========================================')
    console.log('[AI Activity Bot] ✅ Activity cycle completed successfully!')
    console.log('========================================\\n')
    
  } catch (error) {
    console.error('[AI Activity Bot] ❌ Error in activity cycle:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск
loadAiUsers()
runActivityCycle()
  .then(() => {
    console.log('[AI Activity Bot] Process finished, exiting...')
    process.exit(0)
  })
  .catch(error => {
    console.error('[AI Activity Bot] Fatal error:', error)
    process.exit(1)
  })
```

---

## 🔧 PM2 Configuration

### Обновление `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // Existing AI Chat Bot
    {
      name: 'ai-chat-bot',
      script: './ai-chat-bot.js',
      // existing config...
    },
    
    // NEW: AI Activity Bot
    {
      name: 'ai-activity-bot',
      script: './ai-activity-bot.js',
      cron_restart: '*/15 * * * *', // Каждые 15 минут
      autorestart: false, // Не перезапускать автоматически
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/ai-activity-error.log',
      out_file: './logs/ai-activity-out.log',
      time: true,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY
      }
    }
  ]
}
```

---

## ⚙️ Варианты периодичности

| Периодичность | Cron | Описание |
|---------------|------|----------|
| Каждые 5 минут | `*/5 * * * *` | Очень активно, 288 раз/день |
| Каждые 10 минут | `*/10 * * * *` | Активно, 144 раза/день |
| Каждые 15 минут | `*/15 * * * *` | **Рекомендуется**, 96 раз/день |
| Каждые 30 минут | `*/30 * * * *` | Умеренно, 48 раз/день |
| Каждый час | `0 * * * *` | Спокойно, 24 раза/день |

**Рекомендация:** Начать с `*/15 * * * *` (каждые 15 минут)

---

## 🎯 Особенности реализации

### 1. Умная выборка постов
- ✅ Исключаем посты самого AI пользователя
- ✅ Только публичные посты (не locked, не premium)
- ✅ Последние 30 постов (relevance)

### 2. Проверка эмоций
- ✅ Не добавляем эмоцию если уже есть
- ✅ Система поддерживает множественные эмоции
- ✅ Случайный выбор эмоции (1-6)

### 3. Генерация комментариев
- ✅ OpenAI GPT-3.5-turbo
- ✅ Контекст поста (title, type, category)
- ✅ Стиль: школьный сленг, короткие фразы
- ✅ Fallback комментарии при ошибке OpenAI

### 4. Error handling
- ✅ Graceful degradation
- ✅ Logging всех действий
- ✅ Exit codes для PM2

---

## 📊 Ожидаемая активность

### При периодичности 15 минут:

| Метрика | Значение |
|---------|----------|
| Проходов в день | 96 |
| Эмоций в день | ~96 (если нет дубликатов) |
| Комментариев в день | 96 |
| AI пользователей | 25 |
| Активность на пользователя | ~4 действия/день |

### Распределение эмоций:

- ❤️ Like: ~16% (15-17 в день)
- 😂 Haha: ~16% (15-17 в день)
- 😮 Wow: ~17% (16-18 в день)
- 😢 Sad: ~17% (16-18 в день)
- 😡 Angry: ~17% (16-18 в день)
- 🔥 Fire: ~17% (16-18 в день)

---

## ✅ Преимущества решения

1. **Переиспользование кода:**
   - Структура похожа на `ai-chat-bot.js`
   - Те же зависимости (Prisma, OpenAI)
   - Тот же файл пользователей

2. **Безопасность:**
   - Проверка существования поста
   - Исключение своих постов
   - Только публичные посты

3. **Естественность:**
   - OpenAI генерирует живые комментарии
   - Случайный выбор эмоций
   - Разные пользователи

4. **Простота поддержки:**
   - Один файл скрипта
   - PM2 cron для автоматизации
   - Подробное логирование

---

## 🚨 Потенциальные риски

### 1. OpenAI Rate Limits
**Риск:** 96 запросов/день может превысить бесплатный лимит  
**Mitigation:**
- Использовать `gpt-3.5-turbo` (дешёвый)
- Fallback комментарии
- max_tokens: 50

### 2. Дубликаты эмоций
**Риск:** AI пользователь может попасть на тот же пост  
**Mitigation:**
- Проверка `hasEmotion` перед добавлением
- Skip если уже есть

### 3. Нет доступных постов
**Риск:** Если все посты от AI пользователей  
**Mitigation:**
- Graceful skip cycle
- Логирование

### 4. Database connection
**Риск:** Prisma connection pool  
**Mitigation:**
- `prisma.$disconnect()` в finally
- PM2 автоматически перезапустит при ошибке

---

## 📝 Следующие шаги

### После одобрения плана:

1. ✅ Создать файл `ai-activity-bot.js`
2. ✅ Обновить `ecosystem.config.js`
3. ✅ Настроить PM2: `pm2 start ecosystem.config.js`
4. ✅ Проверить logs: `pm2 logs ai-activity-bot`
5. ✅ Мониторинг: `pm2 monit`

---

**Status:** ✅ DISCOVERY COMPLETE  
**Ready for:** User approval → Implementation
