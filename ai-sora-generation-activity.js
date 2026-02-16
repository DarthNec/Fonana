/**
 * AI Sora Generation Activity Bot
 * Автоматически создаёт Sora-2 генерации про смешных котиков
 * 
 * Функционал:
 * - Выбирает случайного AI пользователя из ai-chat-users.json
 * - Генерирует промпт про смешных котиков через OpenAI GPT-3.5-turbo
 * - Создаёт запрос на Sora-2 генерацию через /api/sora/mobile
 * - Создаёт пост через /api/posts
 * - Запускается каждые 4 часа через PM2
 */

// 🔧 Загружаем переменные окружения из .env
require('dotenv').config()

const OpenAI = require('openai')
const axios = require('axios')
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
      console.log(`[AI Sora Bot] ✅ Loaded ${aiUsers.length} AI users`)
    } else {
      console.error('[AI Sora Bot] ❌ AI users file not found!')
      process.exit(1)
    }
  } catch (error) {
    console.error('[AI Sora Bot] ❌ Failed to load AI users:', error)
    process.exit(1)
  }
}

// Получаем рандомного AI пользователя
function getRandomAiUser() {
  return aiUsers[Math.floor(Math.random() * aiUsers.length)]
}

// Получаем случайную длительность (8 или 12 секунд)
function getRandomDuration() {
  return Math.random() < 0.5 ? '8' : '12'
}

// 🧠 Генерируем промпт про смешного котика через OpenAI
async function generateCatPrompt() {
  try {
    console.log('[AI Sora Bot] 🧠 Generating funny cat prompt via OpenAI...')
    
    const prompt = `Ты креативный сценарист для коротких вирусных видео.
Придумай КОРОТКИЙ промпт (1-2 предложения) для Sora-2 генерации видео про смешного котика.

ТРЕБОВАНИЯ:
- Котик должен делать что-то СМЕШНОЕ и МИЛОЕ
- Можно несколько котиков, если это смешнее
- Описание должно быть простым и понятным
- Без сложных эффектов, фокус на котике и его действиях
- Стиль: уютный, домашний, реалистичный
- Длина: максимум 2 предложения

ПРИМЕРЫ ХОРОШИХ ПРОМПТОВ:
"Orange tabby cat trying to fit into a tiny cardboard box, wiggling and pushing with paws, home setting"
"Two playful kittens chasing a laser pointer dot across a living room carpet, tumbling over each other"
"Fluffy white cat wearing tiny sunglasses, sitting on a windowsill like a boss, urban background"
"Grey cat dramatically falling off a couch in slow motion, surprised expression, cozy home"
"Calico cat attempting to catch its own tail, spinning in circles on a wooden floor"
"Black cat sneaking up on a cucumber placed behind it, jumping high in the air when noticing it"

Напиши ТОЛЬКО промпт на английском, без кавычек и пояснений.
Не используй примеры напрямую, придумай что-то новое и креативное!`
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.9 // Высокая креативность
    })
    
    const generatedPrompt = response.choices[0].message.content
      .trim()
      .replace(/^["']|["']$/g, '') // Убираем кавычки если есть
      .slice(0, 200) // Максимум 200 символов
    
    console.log(`[AI Sora Bot] ✅ Generated prompt: "${generatedPrompt}"`)
    return generatedPrompt
    
  } catch (error) {
    console.error('[AI Sora Bot] ⚠️ OpenAI error, using fallback:', error.message)
    
    // Fallback: случайный промпт из предустановленных
    const fallbackPrompts = [
      'Orange tabby cat trying to fit into a tiny cardboard box, wiggling and pushing with paws, home setting',
      'Two playful kittens chasing a laser pointer dot across a living room carpet, tumbling over each other',
      'Fluffy white cat wearing tiny sunglasses, sitting on a windowsill like a boss, urban background',
      'Grey cat dramatically falling off a couch in slow motion, surprised expression, cozy home',
      'Calico cat attempting to catch its own tail, spinning in circles on a wooden floor',
      'Black cat sneaking up on a cucumber placed behind it, jumping high in the air when noticing it',
      'Ginger cat sitting in a perfectly round shape, looking annoyed, minimalist background',
      'Multiple cats synchronized walking in a line across a kitchen counter, mission impossible style',
      'White Persian cat grooming itself with extreme precision, bathroom mirror reflection',
      'Tabby cat playing piano with paws, looking serious and concentrated, music room'
    ]
    
    const fallbackPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)]
    console.log(`[AI Sora Bot] 💬 Using fallback: "${fallbackPrompt}"`)
    return fallbackPrompt
  }
}

// Создаём Sora-2 генерацию через внутренний API
async function createSoraGeneration(prompt, duration) {
  try {
    console.log('[AI Sora Bot] 🎥 Creating Sora-2 generation...')
    console.log(`[AI Sora Bot] Prompt: "${prompt}"`)
    console.log(`[AI Sora Bot] Duration: ${duration}s`)
    console.log(`[AI Sora Bot] Size: 720x1280 (vertical)`)
    
    // Отправляем запрос на внутренний API (как в CreatePostModal)
    const response = await axios.post(
      'http://localhost:3000/api/sora/mobile',
      {
        prompt: prompt,
        seconds: duration,
        size: '720x1280',
        referenceImage: null // Без референсного изображения
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('[AI Sora Bot] ✅ Sora-2 generation response:', response.data)
    
    const videoId = response.data.videoId
    
    if (!videoId) {
      throw new Error('Video ID not found in response')
    }

    console.log(`[AI Sora Bot] 🎬 Video ID: ${videoId}`)
    return videoId
    
  } catch (error) {
    console.error('[AI Sora Bot] ❌ Sora-2 generation error:', error.message)
    if (axios.isAxiosError(error) && error.response) {
      console.error('[AI Sora Bot] Error details:', error.response.data)
    }
    throw error
  }
}

// Создаём пост через API (как в CreatePostModal)
async function createPost(userId, userWallet, prompt, videoId) {
  try {
    console.log('[AI Sora Bot] 📝 Creating post via API...')
    
    // Формируем объект поста (аналогично CreatePostModal)
    const postDataToSend = {
      userWallet: userWallet,
      title: prompt, // Промпт используется как title
      content: '', // Для ai-video контент пустой
      type: 'ai-video',
      category: 'funny',
      tags: ['cat', 'funny', 'ai-generated'],
      thumbnail: '/placeholder-video-enhanced.png', // Плейсхолдер на время генерации
      mediaUrl: null, // URL будет null до завершения генерации
      previewUrl: null,
      blurUrl: null,
      requestId: videoId, // ID Sora-2 генерации
      isLocked: false,
      accessType: 'free',
      price: undefined,
      currency: undefined,
      minSubscriptionTier: undefined,
      imageAspectRatio: undefined,
      isSellable: false,
      sellType: undefined,
      quantity: undefined,
      auctionStartPrice: undefined,
      auctionStepPrice: undefined,
      auctionDuration: undefined,
      auctionDepositAmount: undefined
    }
    
    console.log('[AI Sora Bot] 📤 Sending POST request to /api/posts...')
    console.log('[AI Sora Bot] Post data:', JSON.stringify(postDataToSend, null, 2))
    
    // Отправляем запрос на создание поста
    const response = await axios.post(
      'http://localhost:3000/api/posts',
      postDataToSend,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('[AI Sora Bot] ✅ Post created successfully!')
    console.log('[AI Sora Bot] Post response:', response.data)
    
    const post = response.data.post || response.data
    console.log(`[AI Sora Bot] 📄 Post ID: ${post.id}`)
    
    return post
    
  } catch (error) {
    console.error('[AI Sora Bot] ❌ Error creating post:', error.message)
    if (axios.isAxiosError(error) && error.response) {
      console.error('[AI Sora Bot] Error details:', error.response.data)
    }
    throw error
  }
}

// Основная функция
async function runSoraGenerationCycle() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[AI Sora Bot] 🚀 Starting Sora generation cycle...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  try {
    // 1. Выбираем случайного AI пользователя
    const user = getRandomAiUser()
    console.log(`[AI Sora Bot] 👤 Selected user: ${user.nickname} (${user.id})`)
    
    // 2. Генерируем промпт про смешного котика
    const prompt = await generateCatPrompt()
    
    // 3. Определяем случайную длительность
    const duration = getRandomDuration()
    console.log(`[AI Sora Bot] ⏱️ Duration: ${duration} seconds`)
    
    // 4. Создаём Sora-2 генерацию
    const videoId = await createSoraGeneration(prompt, duration)
    
    // 5. Создаём пост в БД
    const post = await createPost(user.id, user.wallet, prompt, videoId)
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[AI Sora Bot] ✅ Sora generation cycle completed successfully!')
    console.log(`[AI Sora Bot] 📄 Post ID: ${post.id}`)
    console.log(`[AI Sora Bot] 🎬 Video ID: ${videoId}`)
    console.log(`[AI Sora Bot] 🐱 Prompt: "${prompt}"`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('[AI Sora Bot] ❌ Error in Sora generation cycle:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}

// Запуск
console.log('[AI Sora Bot] 🤖 Initializing...')
loadAiUsers()
runSoraGenerationCycle()
  .then(() => {
    console.log('[AI Sora Bot] 🏁 Process finished, exiting...')
    process.exit(0)
  })
  .catch(error => {
    console.error('[AI Sora Bot] 💥 Fatal error:', error)
    process.exit(1)
  })
