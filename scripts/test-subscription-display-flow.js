const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSubscriptionDisplayFlow() {
  console.log('🧪 ТЕСТИРОВАНИЕ ПРОЦЕССА ПОДПИСКИ И ОТОБРАЖЕНИЯ\n')
  
  try {
    // Найдем тестовых пользователей
    const testUser = await prisma.user.findFirst({
      where: { nickname: 'testuser' }
    })
    
    const testCreator = await prisma.user.findFirst({
      where: { nickname: 'testcreator', isCreator: true }
    })
    
    if (!testUser || !testCreator) {
      console.log('❌ Тестовые пользователи не найдены')
      console.log('Создайте пользователей с никнеймами: testuser и testcreator')
      return
    }
    
    console.log(`✅ Тестовые пользователи найдены:`)
    console.log(`  User: ${testUser.nickname} (${testUser.id})`)
    console.log(`  Creator: ${testCreator.nickname} (${testCreator.id})`)
    
    // Проверим текущую подписку
    const currentSub = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: testUser.id,
          creatorId: testCreator.id
        }
      }
    })
    
    if (currentSub) {
      console.log(`\n📌 Текущая подписка:`)
      console.log(`  План: "${currentSub.plan}"`)
      console.log(`  Цена: ${currentSub.price} SOL`)
      console.log(`  Активна: ${currentSub.isActive}`)
      console.log(`  Статус оплаты: ${currentSub.paymentStatus}`)
    } else {
      console.log('\n📌 Подписки нет')
    }
    
    // Симулируем создание Premium подписки
    console.log('\n🔄 СИМУЛЯЦИЯ СОЗДАНИЯ PREMIUM ПОДПИСКИ:')
    
    // 1. Как выглядит запрос из SubscribeModal
    const requestBody = {
      creatorId: testCreator.id,
      plan: 'Premium', // С большой буквы!
      price: 0.15,
      signature: 'test-signature-' + Date.now(),
      hasReferrer: false,
      distribution: {
        creatorWallet: testCreator.wallet || testCreator.solanaWallet,
        creatorAmount: 0.135,
        platformAmount: 0.015,
        referrerAmount: 0,
        referrerWallet: null
      }
    }
    
    console.log('Тело запроса из фронтенда:')
    console.log(JSON.stringify(requestBody, null, 2))
    
    // 2. Проверка доступа к постам
    console.log('\n\n🔐 ПРОВЕРКА ДОСТУПА К ПОСТАМ:')
    
    const creatorPosts = await prisma.post.findMany({
      where: {
        creatorId: testCreator.id,
        isLocked: true,
        minSubscriptionTier: { not: null }
      },
      select: {
        id: true,
        title: true,
        minSubscriptionTier: true
      }
    })
    
    if (creatorPosts.length === 0) {
      console.log('У создателя нет постов с ограничениями по тирам')
    } else {
      const TIER_HIERARCHY = {
        'vip': 4,
        'premium': 3,
        'basic': 2,
        'free': 1
      }
      
      // Тестируем с разными планами
      const testPlans = ['Basic', 'Premium', 'VIP']
      
      for (const testPlan of testPlans) {
        console.log(`\n📊 Если план = "${testPlan}":`)
        
        for (const post of creatorPosts) {
          const userLevel = TIER_HIERARCHY[testPlan.toLowerCase()] || 0
          const requiredLevel = TIER_HIERARCHY[post.minSubscriptionTier.toLowerCase()] || 0
          const hasAccess = userLevel >= requiredLevel
          
          console.log(`  "${post.title}" (требует ${post.minSubscriptionTier}): ${hasAccess ? '✅ Доступен' : '❌ Заблокирован'}`)
        }
      }
    }
    
    // 3. Проблема отображения
    console.log('\n\n🖼️  ПРОБЛЕМА ОТОБРАЖЕНИЯ В UI:')
    console.log('На странице создателя (creator/[id]/page.tsx):')
    console.log('- Строки 551, 565, 594, 608, 634, 648 используют .toLowerCase() для сравнения')
    console.log('- Но строка 396 и 507 отображают план БЕЗ приведения к нижнему регистру')
    console.log('- Поэтому отображается "Premium tier" корректно')
    console.log('\nПроблема может быть в компоненте отображения кнопок апгрейда')
    
    // 4. Рекомендации по исправлению
    console.log('\n\n🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:')
    console.log('1. Стандартизировать отображение планов везде')
    console.log('2. Всегда использовать .toLowerCase() при сравнении')
    console.log('3. Проверить компоненты, где отображаются кнопки подписки')
    console.log('4. Убедиться, что после покупки UI обновляется корректно')
    console.log('5. Проверить, что currentSubscriptionTier обновляется после покупки')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSubscriptionDisplayFlow() 