const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUserWithSubscriptions() {
  try {
    // Создаем тестового пользователя (или находим существующего)
    const testWallet = 'TestWallet' + Date.now()
    const testUser = await prisma.user.create({
      data: {
        wallet: testWallet,
        nickname: 'testuser',
        fullName: 'Test User',
        bio: 'This is a test user',
        isVerified: false,
        isCreator: false
      }
    })
    
    console.log('Создан тестовый пользователь:', testUser)

    // Получаем авторов для подписки
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true
      },
      take: 5
    })

    if (creators.length === 0) {
      console.log('Нет авторов для подписки')
      return
    }

    // Создаем подписки на разных авторов с разными планами
    const plans = [
      { name: 'Basic', price: 0.05 },
      { name: 'Premium', price: 0.15 },
      { name: 'VIP', price: 0.35 }
    ]

    for (let i = 0; i < Math.min(creators.length, 3); i++) {
      const creator = creators[i]
      const plan = plans[i % plans.length]
      
      // Создаем подписку с датой в прошлом
      const daysAgo = Math.floor(Math.random() * 20) + 1
      const subscribedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      const validUntil = new Date(subscribedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: testUser.id,
          creatorId: creator.id,
          plan: plan.name,
          price: plan.price,
          currency: 'SOL',
          subscribedAt: subscribedAt,
          validUntil: validUntil,
          isActive: validUntil > new Date()
        }
      })
      
      console.log(`Создана подписка: ${testUser.nickname} -> ${creator.nickname} (${plan.name})`)
    }

    console.log('\nТестовый пользователь создан!')
    console.log('ID пользователя:', testUser.id)
    console.log('Wallet:', testUser.wallet)
    console.log('\nИспользуйте этот ID для проверки подписок через API:')
    console.log(`http://localhost:3000/api/subscriptions?userId=${testUser.id}`)
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUserWithSubscriptions() 