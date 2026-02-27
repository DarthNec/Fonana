import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import OpenAI from 'openai'

// Инициализация OpenAI клиента
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

// ==========================================
// 🧠 AI CHAT OPTIMIZATION (M7 Analysis)
// ==========================================

// Conversation stages для определения стратегии ответа
enum ConversationStage {
  COLD_START = 'cold_start',        // 0-2 сообщения
  WARMING_UP = 'warming_up',        // 3-7 сообщений
  ENGAGED = 'engaged',              // 8-15 сообщений
  HOT = 'hot',                      // 15+ сообщений
  POST_PURCHASE = 'post_purchase'   // После покупки
}

// User intent classification
enum UserIntent {
  CASUAL_CHAT = 'casual_chat',
  LIGHT_FLIRT = 'light_flirt',
  EXPLICIT_REQUEST = 'explicit_request',
  PURCHASE_INQUIRY = 'purchase_inquiry',
  COMPLIMENT = 'compliment',
  QUESTION = 'question'
}

interface PromptContext {
  stage: ConversationStage
  intent: UserIntent
  engagement: number
  messageCount: number
  hasPurchased: boolean
  consecutiveExplicitRequests: number // 🔥 NEW: Track persistent explicit requests
}

// 🔥 NEW: Detect consecutive explicit requests (M7 Enhancement 2026-02-13)
// Purpose: If user asks 2+ times for explicit content, redirect to profile
function detectConsecutiveExplicitRequests(
  recentMessages: Array<{ senderId: string; content: string | null }>,
  userId: string
): number {
  const userMessages = recentMessages
    .filter(m => m.senderId === userId && m.content)
    .slice(0, 5) // Last 5 messages
  
  let consecutiveCount = 0
  
  // Count consecutive explicit requests from the end (most recent)
  for (const msg of userMessages) {
    if (classifyUserIntent(msg.content || '') === UserIntent.EXPLICIT_REQUEST) {
      consecutiveCount++
    } else {
      break // Stop if non-explicit message found
    }
  }
  
  return consecutiveCount
}

// Определение стадии диалога
function detectConversationStage(
  messageCount: number,
  hasPurchases: boolean
): ConversationStage {
  if (hasPurchases) return ConversationStage.POST_PURCHASE
  if (messageCount >= 15) return ConversationStage.HOT
  if (messageCount >= 8) return ConversationStage.ENGAGED
  if (messageCount >= 3) return ConversationStage.WARMING_UP
  return ConversationStage.COLD_START
}

// Классификация намерения пользователя
function classifyUserIntent(content: string): UserIntent {
  const lowerContent = content.toLowerCase()
  
  // 🔥 EXPANDED: Explicit keywords (added Russian variations)
  const explicitKeywords = [
    // English
    'nude', 'naked', 'dick', 'cock', 'pussy', 'fuck', 'show me', 'tits', 'boobs', 'ass',
    // Russian body parts
    'голую', 'голая', 'голый', 'грудь', 'сиськи', 'сиська', 'жопу', 'жопа', 'киску', 'киска', 'письку',
    // Russian actions
    'покажи', 'показывай', 'показать', 'раздевайся', 'разденься', 'хочу видеть', 'хочу увидеть',
    // Russian explicit
    'трахать', 'секс', 'ебать', 'соси', 'отсоси', 'минет', 'анал',
    // Emoji
    '🥒', '🍆', '🍑', '💦'
  ]
  
  // Purchase keywords
  const purchaseKeywords = [
    'buy', 'price', 'cost', 'сколько', 'купить', 'how much', 
    'subscribe', 'подписаться', 'оплата', 'payment'
  ]
  
  // Flirt keywords
  const flirtKeywords = [
    'sexy', 'hot', 'красивая', 'gorgeous', 'beautiful', 
    'pretty', 'cute', 'милая', 'привлекательная'
  ]
  
  if (explicitKeywords.some(k => lowerContent.includes(k))) {
    return UserIntent.EXPLICIT_REQUEST
  }
  
  if (purchaseKeywords.some(k => lowerContent.includes(k))) {
    return UserIntent.PURCHASE_INQUIRY
  }
  
  if (flirtKeywords.some(k => lowerContent.includes(k))) {
    return UserIntent.LIGHT_FLIRT
  }
  
  // Check for questions
  if (content.includes('?')) {
    return UserIntent.QUESTION
  }
  
  return UserIntent.CASUAL_CHAT
}

// Расчет engagement score (0-100)
function calculateEngagement(
  recentMessages: Array<{ senderId: string; content: string | null; createdAt: Date }>,
  userId: string
): number {
  const userMessages = recentMessages
    .filter(m => m.senderId === userId && m.content)
    .slice(0, 5)
  
  if (userMessages.length === 0) return 50 // Default medium
  
  // 1. Message length (длинные = вовлечен)
  const avgLength = userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / userMessages.length
  const lengthScore = Math.min(100, (avgLength / 50) * 100)
  
  // 2. Emoji usage (эмодзи = эмоциональность)  
  // Simplified emoji detection for ES5 compatibility
  const emojiCount = userMessages.reduce((sum, m) => {
    const content = m.content || ''
    // Count common emoji-like characters (hearts, fire, etc)
    const commonEmojis = ['❤', '💋', '🔥', '😘', '😏', '😊', '💕', '🥵', '👀', '💦']
    const count = commonEmojis.reduce((c, emoji) => {
      return c + (content.split(emoji).length - 1)
    }, 0)
    return sum + count
  }, 0)
  const emojiScore = Math.min(100, emojiCount * 25)
  
  // 3. Question asking (вопросы = интерес)
  const questionCount = userMessages.filter(m => m.content && m.content.includes('?')).length
  const questionScore = Math.min(100, questionCount * 30)
  
  // Weighted average
  let baseScore = Math.round(lengthScore * 0.5 + emojiScore * 0.3 + questionScore * 0.2)
  
  // 🔥 FIX #1: Explicit Request Bonus (M7 Analysis 2026-02-13)
  // Problem: User makes explicit request but gets low engagement score
  // Solution: Boost engagement to minimum 70 for explicit requests
  const hasExplicitRequest = userMessages.some(m => 
    classifyUserIntent(m.content || '') === UserIntent.EXPLICIT_REQUEST
  )
  
  if (hasExplicitRequest) {
    baseScore = Math.max(baseScore, 70) // Minimum 70 for explicit
    console.log('[AI CHAT] 🔥 Explicit request detected, engagement boosted to:', baseScore)
  }
  
  return Math.min(100, baseScore)
}

// Построение динамического промпта
function buildDynamicPrompt(context: PromptContext): string {
  let baseRules = `
БАЗОВЫЕ ПРАВИЛА:
- ОБЯЗАТЕЛЬНО отвечай на том же языке, что и последнее сообщение
- Отвечай кратко (1-3 предложения)
- Используй эмодзи РАЗНООБРАЗНО: 😊😏🔥💋😘💕🥵👅💦😈🍑🍆👀
- НЕ ставь эмодзи в одни и те же места - ВАРЬИРУЙ расположение
- НЕ задавай много вопросов подряд
- Будь естественной, не механической
- НЕ упоминай что ты AI
- ВАЖНО: Каждый ответ должен быть УНИКАЛЬНЫМ - не повторяй одинаковые фразы
- Будь более ОТКРОВЕННОЙ и ПОШЛОЙ (но без вульгарности)
- Используй разные формулировки, синонимы, конструкции предложений`

  // 🔥 FIX #2: Anti-Deflection Rule + Smart Redirect (M7 Enhancement 2026-02-13)
  // Problem: AI responds with "давай оставим это на потом", "подожди"
  // Solution: Add explicit rule against postponement for explicit requests
  // NEW: If user asks 2+ times (persistent), redirect to profile for monetization
  if (context.intent === UserIntent.EXPLICIT_REQUEST) {
    if (context.consecutiveExplicitRequests >= 2) {
      // 🔥 PERSISTENT REQUEST - User asked 2+ times, redirect to profile
      baseRules += `

🔥💰 PERSISTENT EXPLICIT REQUEST (${context.consecutiveExplicitRequests} раз подряд) - SMART REDIRECT:
Он просит уже ${context.consecutiveExplicitRequests} раз подряд - это СИЛЬНАЯ заинтересованность!
Пора мягко перевести на профиль, где весь горячий контент.

СТРАТЕГИЯ ОТВЕТА (ВАРЬИРУЙ, НЕ ПОВТОРЯЙСЯ):

1. СНАЧАЛА признание + флирт (выбери ОДИН вариант):
   - "Ммм, я вижу ты действительно хочешь этого 🔥"
   - "Ты такой настойчивый, это заводит 😏"
   - "Вижу, ты серьезно настроен, мне нравится 🥵"
   - "Какой же ты нетерпеливый, это возбуждает 😈"
   - "О да, ты знаешь чего хочешь 💦"

2. ПОТОМ redirect на профиль (РАЗНЫЕ формулировки):
   - "Весь мой самый горячий контент у меня в профиле 😈"
   - "Я выкладываю всё самое откровенное в своём профиле 🔥"
   - "У меня в профиле есть ВСЁ что ты ищешь 💋"
   - "Там ты найдёшь всё что хочешь увидеть 😏"
   - "В профиле я показываю гораздо больше 🥵"
   
3. ЗАВЕРШЕНИЕ приглашением (ВАРЬИРУЙ):
   - "Заходи, сладкий, не пожалеешь 😘💕"
   - "Обещаю, тебе понравится 💋🔥"
   - "Там ты увидишь то, что искал 😈"
   - "Уверена, ты оценишь, детка 💕"
   - "Там ещё интереснее, обещаю 🔥💦"

ВАЖНО:
- Тон: игривый, соблазнительный, пошлый, НЕ продающий
- НЕ повторяй одинаковые фразы - ВАРЬИРУЙ каждый раз
- Не говори "BUY", "SUBSCRIBE", "PURCHASE"
- Используй: "заходи", "смотри", "там есть", "выкладываю"
- Эмодзи: меняй расположение, используй разные (😈💋🔥😘💕🥵👅💦)
- НЕ извиняйся, НЕ объясняйся - будь уверенной и сексуальной`
    } else {
      // First explicit request - pure flirting, no redirect
      baseRules += `

🔥 EXPLICIT REQUEST DETECTED - ANTI-DEFLECTION MODE:
- НИКОГДА не говори: "позже", "подожди", "в другой раз", "особый момент", "давай оставим"
- НИКОГДА не откладывай - отвечай СЕЙЧАС
- Флиртуй ПО МАКСИМУМУ - страстно, пошло и раскрепощённо
- Используй sexual tension и playful teasing
- Отвечай на его запрос игриво и сексуально
- Будь ОТКРОВЕННОЙ - используй пошлые, но не вульгарные фразы
- ВАРЬИРУЙ ответы - каждый раз по-новому, разными словами
- Engagement level: HIGH (explicit = максимальная заинтересованность)`
    }
  }

  // Stage-specific instructions
  let stageInstructions = ''
  
  switch (context.stage) {
    case ConversationStage.COLD_START:
      stageInstructions = `
СТАДИЯ: Первое знакомство (${context.messageCount} сообщений)
- Будь ДРУЖЕЛЮБНОЙ и открытой, легкий флирт
- Покажи интерес к собеседнику
- НЕ предлагай смотреть профиль - слишком рано!
- Цель: создать комфортную атмосферу`
      break
      
    case ConversationStage.WARMING_UP:
      stageInstructions = `
СТАДИЯ: Разогрев (${context.messageCount} сообщений)
- Усиль флирт, но playful, не explicit
- Используй комплименты
- Можешь намекнуть на свою привлекательность
- НЕТ прямых предложений смотреть профиль
- Создавай anticipation ("Maybe later 😏")`
      break
      
    case ConversationStage.ENGAGED:
      stageInstructions = `
СТАДИЯ: Активное взаимодействие (${context.messageCount} сообщений)

🔥 ФЛИРТ УСИЛЕН (M7 Fix #4):
- Флирт ОБЯЗАТЕЛЬНО откровенный и страстный (не "может быть")
- При explicit request: отвечай ПО МАКСИМУМУ горячо
- НИКОГДА не откладывай на "позже" или "особый момент"
- Используй sexual tension и playful dirty talk
- Баланс: 90% флирт / 10% лёгкий tease (БЕЗ "смотри мой профиль")

Engagement: ${context.engagement}/100
${context.engagement > 60 ? '⚡ ВЫСОКАЯ ВОВЛЕЧЕННОСТЬ - дай ему огня!' : ''}
`
      break
      
    case ConversationStage.HOT:
      stageInstructions = `
СТАДИЯ: Горячий диалог (${context.messageCount}+ сообщений, engagement ${context.engagement}/100)

🔥🔥🔥 МАКСИМАЛЬНЫЙ HEAT (M7 Fix #4):
- Флирт максимально откровенный (но не вульгарный)
- Он ОЧЕНЬ заинтересован - дай ему то, что он хочет
- ZERO редиректов на профиль - только чистый флирт
- Отвечай на explicit requests страстно и игриво
- Используй dirty talk, emojis, создавай sexual tension
- Цель: удержать его в чате, создать ОГОНЬ 🔥

⚡ ЗАПРЕЩЕНО: "позже", "подожди", "особый момент", "сначала давай..."
✅ ОБЯЗАТЕЛЬНО: страсть, огонь, игривость, отзывчивость
`
      break
      
    case ConversationStage.POST_PURCHASE:
      stageInstructions = `
СТАДИЯ: После покупки ✅
- Будь ОСОБЕННО милой и благодарной
- Флирт более personal и intimate
- НЕ продавай больше контента сейчас
- Фокус на relationship building
- Покажи что ценишь его: "You're special to me 💕"`
      break
  }
  
  // Monetization strategy
  let monetization = ''
  
  if (context.hasPurchased) {
    monetization = `
МОНЕТИЗАЦИЯ: OFF (он уже subscriber)
Фокус на удержании и лояльности.`
  } else if (context.stage === ConversationStage.COLD_START) {
    monetization = `
МОНЕТИЗАЦИЯ: OFF
НЕ упоминай профиль. Строй доверие сначала.`
  } else if (context.stage === ConversationStage.WARMING_UP) {
    monetization = `
МОНЕТИЗАЦИЯ: SOFT HINTS
Можешь намекнуть "I post more on my profile 😊"
ТОЛЬКО если контекст подходящий.`
  } else if (context.stage === ConversationStage.ENGAGED) {
    if (context.intent === UserIntent.EXPLICIT_REQUEST) {
      // 🔥 FIX #3: Reduce Redirect Probability (M7 Analysis 2026-02-13)
      // Was: 50% redirect (too high, breaks flow)
      // Now: 20% redirect, ONLY when LOW engagement (<50)
      const shouldRedirect = context.engagement < 50 && Math.random() < 0.2
      
      if (shouldRedirect) {
        monetization = `
МОНЕТИЗАЦИЯ: VERY SOFT SELL (20% вероятность, ТОЛЬКО если engagement < 50)
1. СНАЧАЛА 2-3 предложения горячего флирта
2. ПОТОМ очень мягко: "I have even more on my profile 😈"
3. СРАЗУ вернись к флирту - не жди ответа
4. НИКОГДА не говори "later" или "wait"`
      } else {
        monetization = `
МОНЕТИЗАЦИЯ: OFF (80% вероятность)
100% флирт. Создавай максимальный heat.
Отвечай на его запрос флиртом и страстью.
НИКАКИХ редиректов - только огонь 🔥`
      }
    } else {
      monetization = `
МОНЕТИЗАЦИЯ: LIGHT HINTS
Приоритет на engagement, не на продажах.`
    }
  } else if (context.stage === ConversationStage.HOT && context.engagement > 70) {
    // 🔥 FIX #3: Reduce HOT stage redirect (M7 Analysis)
    // Was: 70% redirect (too aggressive)
    // Now: 30% redirect, ONLY when engagement not super high
    const shouldRedirect = context.engagement < 80 && Math.random() < 0.3
    
    if (shouldRedirect) {
      monetization = `
МОНЕТИЗАЦИЯ: SOFT SELL (30% вероятность)
Он готов! Но НЕ дави.
- Создавай desire: "Wait till you see what I have..."
- Показывай value: "My profile has so much more 😈"
- НЕ говори "BUY" или "SUBSCRIBE"`
    } else {
      monetization = `
МОНЕТИЗАЦИЯ: OFF (70% вероятность)
Просто флиртуй БЕЗ редиректа - он уже в огне 🔥
Создавай максимальный heat, удерживай в чате.`
    }
  } else {
    monetization = `
МОНЕТИЗАЦИЯ: OFF
Фокус на создании connection.`
  }
  
  // Emotional tone based on engagement
  let emotionalTone = ''
  if (context.engagement > 80) {
    emotionalTone = `
ВЫСОКАЯ ВОВЛЕЧЕННОСТЬ (${context.engagement}/100):
Он очень заинтересован! Будь смелее и откровеннее.`
  } else if (context.engagement < 40) {
    emotionalTone = `
НИЗКАЯ ВОВЛЕЧЕННОСТЬ (${context.engagement}/100):
Он не очень активен. Будь дружелюбнее, НЕ дави с флиртом.`
  }
  
  // 🔥 FIX #5: Soft Tips Monetization Strategy (M7 Analysis 2026-02-13)
  // ENHANCED: Increased probability 30% → 50% for better monetization
  // Goal: Subtly hint at tips after several good messages
  // Method: Embed compliments that suggest support, not direct requests
  let tipsStrategy = ''
  
  if (!context.hasPurchased && 
      context.messageCount >= 5 && 
      context.engagement > 60 &&
      context.stage !== ConversationStage.COLD_START &&
      context.stage !== ConversationStage.POST_PURCHASE) {
    
    // 🔥 INCREASED: 30% → 50% probability (user feedback)
    const shouldHintTips = Math.random() < 0.5
    
    if (shouldHintTips) {
      tipsStrategy = `
💰 SOFT TIPS HINT (50% вероятность, после 5+ хороших сообщений):
- Включи ОЧЕНЬ мягкий намёк на поддержку/чаевые в свой флирт
- НИКОГДА не проси прямо ("Send me tips", "Tip me")
- Примеры мягких намёков (выбери подходящий по контексту):
  * "You're making my evening so much better 😊💕" (комплимент + благодарность)
  * "I love chatting with you, you're so fun 🔥" (показывает ценность общения)
  * "You know how to make a girl feel special 😘" (признание особенности)
  * "Talking to you is the highlight of my day 💋" (эмоциональная связь)
  * "Ты делаешь мой вечер таким горячим 🥵" (Russian variant)
  * "С тобой так приятно общаться, ты особенный 😏" (Russian variant)
- Это НЕ продажа - это искренний комплимент с подтекстом
- Продолжай флиртовать ПОСЛЕ намёка - не жди реакции
- МАКСИМУМ 1 раз за 10 сообщений (не спамь)
- Встрой в естественный флирт, НЕ отдельной строкой`
    }
  }
  
  return `${baseRules}

${stageInstructions}

${emotionalTone}

${monetization}

${tipsStrategy}

Отвечай как привлекательная и раскрепощённая девушка/парень. 
НЕ задавай вопросы. Реагируй флиртующе на то, что тебе написали.
Завершай утверждением или соблазнительным комментарием.`
}

// Получение сообщений
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const conversationId = params.id
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что пользователь участник чата через raw query
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Получаем параметры пагинации
    const url = new URL(request.url)
    const before = url.searchParams.get('before')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    // Создаем условие для пагинации
    let whereCondition: any = { conversationId }
    if (before) {
      // Получаем дату сообщения before для пагинации
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true }
      })
      
      if (beforeMessage) {
        whereCondition.createdAt = {
          lt: beforeMessage.createdAt
        }
      }
    }
    
    // Получаем сообщения с пагинацией
    const messages = await prisma.message.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        purchases: {
          where: { userId: user.id },
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })
    
    // Проверяем есть ли еще сообщения
    const hasMore = messages.length === limit
    
    // Помечаем сообщения как прочитанные
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: user.id },
        isRead: false
      },
      data: { isRead: true }
    })
    
    // Получаем данные отправителей
    const senderIds = Array.from(new Set(messages.map(m => m.senderId)))
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: {
        id: true,
        wallet: true,
        nickname: true,
        fullName: true,
        avatar: true
      }
    })
    const sendersMap = Object.fromEntries(senders.map(s => [s.id, s]))
    
    // Форматируем сообщения
    const formattedMessages = messages.map((message: any) => ({
      ...message,
      sender: sendersMap[message.senderId],
      content: message.isPaid && message.purchases.length === 0 && message.senderId !== user.id
        ? null 
        : message.content,
      isPurchased: message.purchases.length > 0,
      isOwn: message.senderId === user.id
    }))
    
    return NextResponse.json({ 
      messages: formattedMessages,
      hasMore: hasMore
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// Отправка сообщения
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let message: any
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const conversationId = params.id
    const { content, mediaUrl, mediaType, isPaid, price, metadata } = await request.json()
    
    // Валидация
    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content or media required' }, { status: 400 })
    }
    
    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Valid price required for paid messages' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем что пользователь участник чата через raw query
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${conversationId}
    `
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Создаем сообщение
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content,
        mediaUrl,
        mediaType,
        isPaid: isPaid || false,
        price: isPaid ? price : null,
        metadata
      },
      // NOTE: sender relation not available in schema
    })
    
    // NOTE: Conversation model is @@ignore in schema, skip lastMessageAt update
    
    // Получаем получателя сообщения для создания уведомления
    const recipientId = conv.fromUserId === user.id ? conv.toUserId : conv.fromUserId
    
    // Создаем уведомление для получателя
    await prisma.notification.create({
      data: {
        userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          message: isPaid 
            ? `${user.nickname || 'User'} sent you a paid message (${price} SOL)`
            : `${user.nickname || 'User'}: ${content?.substring(0, 50) || 'Sent a media'}`,
          metadata: {
            conversationId,
            messageId: message.id,
            senderId: user.id,
            senderName: user.nickname || 'User',
            isPaid,
            price
          }
        }
      })
    
    // Проверяем, нужно ли автоматически ответить от имени получателя
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        isAutoAnswerInChat: true
      }
    })
    
    // Если у получателя включен автоответ, генерируем ответ через OpenAI
    if (recipient?.isAutoAnswerInChat && process.env.NEXT_PUBLIC_OPENAI_API_KEY && !isPaid && content) {
      try {
        console.log('[Auto-reply] Generating automatic response for recipient:', recipientId)
        
        // Получаем последние 15 сообщений для лучшего контекста
        const recentMessages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            senderId: true,
            content: true,
            createdAt: true,
            purchases: {
              where: { userId: user.id },
              select: { id: true }
            }
          }
        })
        
        // ==========================================
        // 🧠 CONTEXT ANALYSIS (M7 Optimization)
        // ==========================================
        
        const messageCount = recentMessages.length
        const hasPurchases = recentMessages.some(m => m.purchases && m.purchases.length > 0)
        
        // Определяем стадию диалога
        const stage = detectConversationStage(messageCount, hasPurchases)
        
        // Классифицируем намерение пользователя
        const intent = classifyUserIntent(content)
        
        // Рассчитываем вовлеченность
        const engagement = calculateEngagement(recentMessages, user.id)
        
        // 🔥 NEW: Detect consecutive explicit requests for smart redirect
        const consecutiveExplicitRequests = detectConsecutiveExplicitRequests(recentMessages, user.id)
        
        if (consecutiveExplicitRequests >= 2) {
          console.log(`[AI CHAT] 💰 PERSISTENT REQUEST detected: User asked ${consecutiveExplicitRequests} times in a row - redirecting to profile`)
        }
        
        const context: PromptContext = {
          stage,
          intent,
          engagement,
          messageCount,
          hasPurchased: hasPurchases,
          consecutiveExplicitRequests // 🔥 NEW field
        }
        
        console.log('[Auto-reply] Context:', {
          stage,
          intent,
          engagement,
          messageCount,
          hasPurchases,
          consecutiveExplicitRequests // 🔥 Log persistent requests
        })
        
        // ==========================================
        // 📝 DYNAMIC PROMPT GENERATION
        // ==========================================
        
        // Формируем историю чата
        const chatHistory = recentMessages
          .reverse()
          .slice(-10) // Последние 10 для контекста
          .map(msg => {
            const isRecipient = msg.senderId === recipientId
            const senderName = isRecipient 
              ? (recipient.nickname || recipient.fullName || 'Me') 
              : (user.nickname || user.fullName || 'User')
            return `${senderName}: ${msg.content || '[Media]'}`
          })
          .join('\n')
        
        // Генерируем динамический промпт на основе контекста
        const dynamicInstructions = buildDynamicPrompt(context)
        
        // Финальный системный промпт
        const systemPrompt = `Ты - ${recipient.nickname || recipient.fullName || 'пользователь'}, участник чата на платформе для взрослого контента.

${dynamicInstructions}

История чата:
${chatHistory}

Последнее сообщение от ${user.nickname || user.fullName || 'собеседника'}: ${content}

Сгенерируй естественный, флиртующий ответ НА ТОМ ЖЕ ЯЗЫКЕ.`

        // Генерируем ответ через OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        })
        
        const autoReplyContent = completion.choices[0].message.content
        
        if (autoReplyContent) {
          console.log('[Auto-reply] Generated response:', autoReplyContent.substring(0, 100))
          
          // Создаем автоматическое сообщение от имени получателя
          const autoMessage = await prisma.message.create({
            data: {
              conversationId,
              senderId: recipientId,
              content: autoReplyContent,
              isPaid: false,
              isAIanswer: true // 🤖 Помечаем как AI-ответ
            }
          })
          
          console.log('[Auto-reply] Auto-reply message created:', autoMessage.id)
          
          // Создаем уведомление для отправителя о автоответе
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'NEW_MESSAGE',
              title: 'New message',
              message: `${recipient.nickname || 'User'}: ${autoReplyContent.substring(0, 50)}`,
              metadata: {
                conversationId,
                messageId: autoMessage.id,
                senderId: recipientId,
                senderName: recipient.nickname || 'User',
                isAutoReply: true
              }
            }
          })
        }
      } catch (autoReplyError) {
        console.error('[Auto-reply] Error generating automatic response:', autoReplyError)
        // Не падаем если автоответ не сработал, просто логируем ошибку
      }
    }
    
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
} 