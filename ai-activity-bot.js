/**
 * AI Activity Bot - автоматическая активность AI пользователей
 * Запускается через PM2, выполняет один проход активности
 * 
 * Функционал:
 * - Выбирает случайного AI пользователя из ai-chat-users.json
 * - Ставит реакцию на случайный пост (если не ставил)
 * - 🧠 Генерирует комментарий через OpenAI GPT-3.5-turbo (ОБЯЗАТЕЛЬНО!)
 * - Анализирует title + content поста для контекстных комментариев
 * - Берёт последние 80 постов (не супер старые!)
 */

// 🔥 FIX 2026-03-09: Используем синглтон prisma для предотвращения connection pool exhaustion
const { prisma } = require('./lib/prisma')
const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')

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
      console.log(`[AI Activity Bot] ✅ Loaded ${aiUsers.length} AI users`)
    } else {
      console.error('[AI Activity Bot] ❌ AI users file not found!')
      process.exit(1)
    }
  } catch (error) {
    console.error('[AI Activity Bot] ❌ Failed to load AI users:', error)
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
      console.log('[AI Activity Bot] ⚠️ No available posts found')
      return null
    }
    
    console.log(`[AI Activity Bot] 📊 Found ${posts.length} posts, selecting random...`)
    
    // Случайный выбор из последних 80
    return posts[Math.floor(Math.random() * posts.length)]
  } catch (error) {
    console.error('[AI Activity Bot] ❌ Error fetching posts:', error)
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
    console.error('[AI Activity Bot] ❌ Error checking emotions:', error)
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
    
    console.log(`[AI Activity Bot] ✅ Added emotion: ${emotionNames[emotionId]}`)
    return true
  } catch (error) {
    console.error('[AI Activity Bot] ❌ Error adding emotion:', error)
    return false
  }
}

// 🧠 Генерируем комментарий через OpenAI - SMART ANALYSIS
async function generateComment(post, user) {
  try {
    // 🧠 КЛЮЧЕВОЕ: Анализируем title И content (description)!
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
    
    console.log('[AI Activity Bot] 🧠 Generating SMART comment via OpenAI...')
    console.log(`[AI Activity Bot] 📝 Context: title="${postTitle.slice(0, 50)}", contentLength=${postContent.length}, type=${postType}`)
    
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
    
    const fallbackComment = fallbackArray[Math.floor(Math.random() * fallbackArray.length)]
    console.log(`[AI Activity Bot] 💬 Using fallback: "${fallbackComment}"`)
    return fallbackComment
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
    
    console.log(`[AI Activity Bot] ✅ Comment created: ${comment.id}`)
    return true
  } catch (error) {
    console.error('[AI Activity Bot] ❌ Error creating comment:', error)
    return false
  }
}

// Основная функция
async function runActivityCycle() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[AI Activity Bot] 🚀 Starting activity cycle...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  try {
    // 1. Выбираем случайного AI пользователя
    const user = getRandomAiUser()
    console.log(`[AI Activity Bot] 👤 Selected user: ${user.nickname} (${user.id})`)
    
    // 2. Получаем случайный пост из последних 80 (не свой)
    const post = await getRandomPost(user.id)
    if (!post) {
      console.log('[AI Activity Bot] ⚠️ No posts available, skipping cycle')
      return
    }
    console.log(`[AI Activity Bot] 📄 Selected post: "${post.title}" (${post.type})`)
    console.log(`[AI Activity Bot] 📊 Post ID: ${post.id}, Creator: ${post.creatorId}`)
    
    // 3. Проверяем и добавляем эмоцию
    const hasEmotionOnPost = await hasEmotion(user.id, post.id)
    if (!hasEmotionOnPost) {
      console.log('[AI Activity Bot] 💭 Adding emotion...')
      await addRandomEmotion(user.id, post.id)
    } else {
      console.log('[AI Activity Bot] 💭 User already has emotion on this post, skipping...')
    }
    
    // 4. 🧠 Генерируем комментарий через OpenAI (ОБЯЗАТЕЛЬНО!)
    console.log('[AI Activity Bot] 💬 Generating comment...')
    const commentText = await generateComment(post, user)
    
    // 5. Создаём комментарий
    console.log('[AI Activity Bot] 📝 Creating comment...')
    await createComment(user.id, post.id, commentText)
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[AI Activity Bot] ✅ Activity cycle completed successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[AI Activity Bot] ❌ Error in activity cycle:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
  // 🔥 FIX 2026-03-09: Не вызываем prisma.$disconnect() - синглтон управляет lifecycle сам
}

// Запуск
console.log('[AI Activity Bot] 🤖 Initializing...')
loadAiUsers()
runActivityCycle()
  .then(() => {
    console.log('[AI Activity Bot] 🏁 Process finished, exiting...')
    process.exit(0)
  })
  .catch(error => {
    console.error('[AI Activity Bot] 💥 Fatal error:', error)
    process.exit(1)
  })
