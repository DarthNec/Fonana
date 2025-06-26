const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseSubscriptionDisplayIssue() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С ОТОБРАЖЕНИЕМ ПОДПИСОК\n')
  
  try {
    // 1. Проверка форматов планов в БД
    console.log('1️⃣ ФОРМАТЫ ПЛАНОВ В БАЗЕ ДАННЫХ:')
    const planFormats = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
      where: {
        isActive: true,
        paymentStatus: 'COMPLETED'
      }
    })
    
    console.log('Активные подписки по планам:')
    planFormats.forEach(p => {
      console.log(`  ${p.plan}: ${p._count} подписок`)
    })
    
    // 2. Найти недавние примеры проблемы
    console.log('\n2️⃣ НЕДАВНИЕ ПОДПИСКИ С ТРАНЗАКЦИЯМИ:')
    const recentSubs = await prisma.subscription.findMany({
      where: {
        subscribedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        price: { gt: 0 },
        paymentStatus: 'COMPLETED'
      },
      include: {
        user: { select: { nickname: true, wallet: true } },
        creator: { 
          select: { 
            nickname: true,
            tierSettings: true
          } 
        }
      },
      orderBy: { subscribedAt: 'desc' },
      take: 5
    })
    
    for (const sub of recentSubs) {
      console.log(`\n📌 ${sub.user.nickname} → ${sub.creator.nickname}:`)
      console.log(`  План в БД: "${sub.plan}"`)
      console.log(`  Цена: ${sub.price} SOL`)
      console.log(`  Создано: ${sub.subscribedAt.toISOString()}`)
      
      // Проверим кастомные настройки тиров
      if (sub.creator.tierSettings) {
        const settings = sub.creator.tierSettings
        console.log(`  Кастомные цены создателя:`)
        if (settings.basicTier) {
          const basic = typeof settings.basicTier === 'string' ? JSON.parse(settings.basicTier) : settings.basicTier
          console.log(`    Basic: ${basic.price} SOL`)
        }
        if (settings.premiumTier) {
          const premium = typeof settings.premiumTier === 'string' ? JSON.parse(settings.premiumTier) : settings.premiumTier
          console.log(`    Premium: ${premium.price} SOL`)
        }
        if (settings.vipTier) {
          const vip = typeof settings.vipTier === 'string' ? JSON.parse(settings.vipTier) : settings.vipTier
          console.log(`    VIP: ${vip.price} SOL`)
        }
      }
      
      // Проверим транзакцию
      const transaction = await prisma.transaction.findFirst({
        where: { subscriptionId: sub.id }
      })
      
      if (transaction?.metadata) {
        const metadata = transaction.metadata
        console.log(`  План из транзакции: "${metadata.plan}"`)
      }
    }
    
    // 3. Проверка несоответствий план/цена
    console.log('\n3️⃣ ПРОВЕРКА НЕСООТВЕТСТВИЙ ПЛАН/ЦЕНА:')
    
    const standardPrices = {
      'Basic': 0.05,
      'Premium': 0.15,
      'VIP': 0.35
    }
    
    for (const [plan, expectedPrice] of Object.entries(standardPrices)) {
      const wrongPriceSubs = await prisma.subscription.count({
        where: {
          plan,
          price: { not: expectedPrice },
          isActive: true,
          creator: {
            tierSettings: null // Только создатели без кастомных цен
          }
        }
      })
      
      if (wrongPriceSubs > 0) {
        console.log(`  ⚠️  ${plan}: ${wrongPriceSubs} подписок с неправильной ценой`)
      }
    }
    
    // 4. Проверка постов с ограничениями
    console.log('\n4️⃣ ПОСТЫ С ОГРАНИЧЕНИЯМИ ПО ТИРАМ:')
    const tieredPosts = await prisma.post.groupBy({
      by: ['minSubscriptionTier'],
      _count: true,
      where: {
        minSubscriptionTier: { not: null }
      }
    })
    
    console.log('Посты по требуемым тирам:')
    tieredPosts.forEach(p => {
      console.log(`  ${p.minSubscriptionTier}: ${p._count} постов`)
    })
    
    // 5. Проверка конкретного случая
    console.log('\n5️⃣ АНАЛИЗ КОНКРЕТНОГО СЛУЧАЯ:')
    console.log('Введите nickname пользователя и создателя для проверки:')
    console.log('Пример: node scripts/diagnose-subscription-display-issue.js username creatorname')
    
    const userNick = process.argv[2]
    const creatorNick = process.argv[3]
    
    if (userNick && creatorNick) {
      const user = await prisma.user.findFirst({
        where: { nickname: userNick }
      })
      
      const creator = await prisma.user.findFirst({
        where: { nickname: creatorNick }
      })
      
      if (user && creator) {
        const subscription = await prisma.subscription.findUnique({
          where: {
            userId_creatorId: {
              userId: user.id,
              creatorId: creator.id
            }
          }
        })
        
        if (subscription) {
          console.log(`\nПодписка ${userNick} на ${creatorNick}:`)
          console.log(`  ID: ${subscription.id}`)
          console.log(`  План: "${subscription.plan}"`)
          console.log(`  Цена: ${subscription.price} SOL`)
          console.log(`  Статус оплаты: ${subscription.paymentStatus}`)
          console.log(`  Активна: ${subscription.isActive}`)
          console.log(`  Действует до: ${subscription.validUntil}`)
          
          // Проверим доступ к постам
          const lockedPosts = await prisma.post.findMany({
            where: {
              creatorId: creator.id,
              isLocked: true,
              minSubscriptionTier: { not: null }
            },
            select: {
              title: true,
              minSubscriptionTier: true
            }
          })
          
          console.log(`\nДоступ к постам:`)
          const TIER_HIERARCHY = {
            'vip': 4,
            'premium': 3,
            'basic': 2,
            'free': 1
          }
          
          lockedPosts.forEach(post => {
            const userLevel = TIER_HIERARCHY[subscription.plan.toLowerCase()] || 0
            const requiredLevel = TIER_HIERARCHY[post.minSubscriptionTier.toLowerCase()] || 0
            const hasAccess = userLevel >= requiredLevel
            
            console.log(`  "${post.title}" (требует ${post.minSubscriptionTier}): ${hasAccess ? '✅ Доступен' : '❌ Заблокирован'}`)
          })
        } else {
          console.log(`\n❌ Подписка ${userNick} на ${creatorNick} не найдена`)
        }
      }
    }
    
    // Рекомендации
    console.log('\n📋 РЕКОМЕНДАЦИИ:')
    console.log('1. Планы в БД хранятся с заглавной буквы: "Basic", "Premium", "VIP"')
    console.log('2. Проверка доступа работает корректно благодаря .toLowerCase()')
    console.log('3. Проблема в отображении - нужно везде использовать .toLowerCase() при сравнении')
    console.log('4. SubscribeModal отправляет планы с заглавной буквы')
    console.log('5. Нужно стандартизировать отображение планов во всех компонентах')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseSubscriptionDisplayIssue() 