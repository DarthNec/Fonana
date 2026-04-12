/**
 * AI Chat Bot - автоматически генерирует сообщения в чате
 * Запускается через PM2, работает постоянно
 * Общается на РУССКОМ языке
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
      console.log(`[AI Chat Bot] Loaded ${aiUsers.length} AI users`)
    } else {
      console.error('[AI Chat Bot] AI users file not found! Run: node scripts/create-ai-chat-users.js')
      process.exit(1)
    }
  } catch (error) {
    console.error('[AI Chat Bot] Failed to load AI users:', error)
    process.exit(1)
  }
}

// Получаем рандомного AI пользователя
function getRandomAiUser() {
  return aiUsers[Math.floor(Math.random() * aiUsers.length)]
}

// Получаем рандомного AI пользователя, но не того же самого
function getRandomAiUserExcept(excludeId) {
  const filtered = aiUsers.filter(u => u.id !== excludeId)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

// Темы для разговоров на русском (школьный стиль)
const chatTopics = [
  'крипта и кто сколько слил',
  'кто во что играет',
  'тиктоки и мемы',
  'кто откуда и чё по жизни',
  'фильмы и сериалы',
  'музыка - кто что слушает',
  'работа и подработка',
  'кто что ел сегодня',
  'погода отстой или норм',
  'сон и режим дня',
  'кто на чём сидит (телефоны/компы)',
  'прикольные истории из жизни',
  'планы на выходные',
  'кто с кем общается',
  'жизненные советы (саркастичные)'
]

// Генерация сообщения через OpenAI
async function generateMessage(recentChat = [], replyToUser = null) {
  const topic = chatTopics[Math.floor(Math.random() * chatTopics.length)]
  
  // Формируем контекст последних сообщений
  const chatContext = recentChat.slice(0, 5).reverse().map(m => 
    `${m.nickname}: ${m.message}`
  ).join('\n')
  
  let prompt
  if (replyToUser) {
    // Решаем как реагировать на реального пользователя (школьный стиль)
    const reactions = [
      'подкольни его по-дружески, добавь )) в конце',
      'притворись что не понял о чём он',
      'ответь саркастично но без агрессии',
      'согласись но добавь что-то смешное',
      'переспроси как будто он сказал глупость',
      'проигнорируй и напиши про своё',
      'поддержи но с подколом',
      'скажи "ну такое" или "спорно"',
      'задай тупой вопрос в ответ',
      'напиши "а чё сразу я" или подобное'
    ]
    const reaction = reactions[Math.floor(Math.random() * reactions.length)]
    
    prompt = `Контекст чата:
${chatContext}

Последнее сообщение от ${replyToUser.nickname}: "${replyToUser.message}"

Твоя реакция: ${reaction}

Напиши ответ как подросток в чатике (1 предложение, максимум 2). Если шутишь - добавляй )) в конце.`
  } else {
    prompt = `Контекст чата:
${chatContext}

Напиши сообщение о "${topic}" или продолжи разговор (1 предложение, максимум 2).
Пиши коротко, с подколами, можно )) если шутка. Можно жаловаться на жизнь, подкалывать других в чате.`
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `Ты подросток 16-20 лет в русском чатике. Пиши ТОЛЬКО на русском.

СТИЛЬ:
- Короткие сообщения (1 предложение, редко 2)
- Много подколов и сарказма
- Если шутишь или подкалываешь - ставь )) в конце (не смайлики, именно скобки)
- Можно лёгкий газлайтинг типа "ты чё, я такого не говорил" или "это же очевидно"
- Жалуйся на жизнь, погоду, усталость
- Используй "чё", "норм", "кста", "хз", "лол", "кек", "ору"
- НЕ используй эмодзи часто, лучше )) или просто текст
- НЕ пиши на английском
- НЕ используй хэштеги
- НЕ будь вежливым и формальным

ПРИМЕРЫ:
- "ну такое честно))"
- "а чё сразу я"
- "кто спрашивал вообще))"
- "спорно"
- "ору с этого"
- "да ладно, не гони"
- "чел, ты серьёзно?"

Веди себя как реальный чел из чатика, а не как бот.`
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.95
    })
    
    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('[AI Chat Bot] OpenAI error:', error.message)
    return null
  }
}

// Отправка сообщения в чат
async function sendMessage(user, message) {
  try {
    const newMessage = await prisma.aiChatMessage.create({
      data: {
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        message: message
      }
    })
    console.log(`[AI Chat Bot] ${user.nickname}: ${message}`)
    return newMessage
  } catch (error) {
    console.error('[AI Chat Bot] Failed to send message:', error.message)
    return null
  }
}

// Получаем последние сообщения
async function getRecentMessages(limit = 10) {
  try {
    return await prisma.aiChatMessage.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    console.error('[AI Chat Bot] Failed to get recent messages:', error.message)
    return []
  }
}

// Проверяем, есть ли сообщения от реальных пользователей (не AI)
function isRealUserMessage(message) {
  const aiUserIds = new Set(aiUsers.map(u => u.id))
  return !aiUserIds.has(message.userId)
}

// Рандомная задержка
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Ждём указанное время
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Основной цикл бота
async function runBot() {
  console.log('[AI Chat Bot] Starting... (RU mode, 2.5min delay)')
  loadAiUsers()
  
  let lastCheckedMessageId = null
  let processedRealUserIds = new Set() // Чтобы не отвечать дважды на одно сообщение
  
  while (true) {
    try {
      // Получаем последние сообщения
      const recentMessages = await getRecentMessages(10)
      
      // Проверяем, есть ли новые сообщения от реальных пользователей
      let realUserMessage = null
      
      for (const msg of recentMessages) {
        if (msg.id === lastCheckedMessageId) break
        
        // Проверяем что это реальный пользователь и мы ещё не отвечали на это сообщение
        if (isRealUserMessage(msg) && !processedRealUserIds.has(msg.id)) {
          realUserMessage = msg
          processedRealUserIds.add(msg.id)
          break
        }
      }
      
      // Очищаем старые ID (храним только последние 50)
      if (processedRealUserIds.size > 50) {
        const arr = Array.from(processedRealUserIds)
        processedRealUserIds = new Set(arr.slice(-50))
      }
      
      if (recentMessages.length > 0) {
        lastCheckedMessageId = recentMessages[0].id
      }
      
      if (realUserMessage) {
        // 70% шанс ответить реальному пользователю
        if (Math.random() < 0.7) {
          // Задержка перед ответом реальному пользователю (5-20 секунд)
          const delay = randomDelay(5000, 20000)
          console.log(`[AI Chat Bot] Real user detected: "${realUserMessage.message.substring(0, 50)}..." Replying in ${delay/1000}s...`)
          await sleep(delay)
          
          const responder = getRandomAiUser()
          const reply = await generateMessage(recentMessages, realUserMessage)
          
          if (reply) {
            await sendMessage(responder, reply)
          }
        } else {
          console.log(`[AI Chat Bot] Ignoring real user message (30% chance)`)
        }
      }
      
      // Обычная AI болтовня - задержка 2.5 минуты (150 секунд) +/- 30 секунд
      const delay = randomDelay(120000, 180000) // 2-3 минуты
      console.log(`[AI Chat Bot] Next message in ${(delay/1000/60).toFixed(1)} min...`)
      await sleep(delay)
      
      // Получаем свежие сообщения для контекста
      const freshMessages = await getRecentMessages(10)
      
      const user = getRandomAiUser()
      
      // 50% шанс ответить на последнее сообщение, 50% - новая тема
      const lastMessage = freshMessages[0]
      const shouldReply = lastMessage && Math.random() < 0.5
      
      let message
      if (shouldReply && lastMessage.userId !== user.id) {
        message = await generateMessage(freshMessages, lastMessage)
      } else {
        message = await generateMessage(freshMessages, null)
      }
      
      if (message) {
        await sendMessage(user, message)
      }
      
    } catch (error) {
      console.error('[AI Chat Bot] Error in main loop:', error)
      await sleep(10000)
    }
  }
}

// Graceful shutdown
// 🔥 FIX 2026-03-09: Не вызываем prisma.$disconnect() - синглтон управляет lifecycle сам
process.on('SIGINT', async () => {
  console.log('[AI Chat Bot] Shutting down...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[AI Chat Bot] Shutting down...')
  process.exit(0)
})

// Запуск
runBot()
