const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestSubscriptions() {
  try {
    // Получаем всех пользователей
    const users = await prisma.user.findMany()
    
    if (users.length < 2) {
      console.log('Недостаточно пользователей в базе данных')
      return
    }

    // Берем первого пользователя как подписчика
    const subscriber = users[0]
    
    // Создаем подписки на других пользователей
    const subscriptions = []
    
    for (let i = 1; i < Math.min(users.length, 4); i++) {
      const creator = users[i]
      
      // Определяем план и цену
      const plans = [
        { name: 'Basic', price: 0.05 },
        { name: 'Premium', price: 0.15 },
        { name: 'VIP', price: 0.35 }
      ]
      
      const plan = plans[i % plans.length]
      
      // Создаем случайную дату подписки в прошлом
      const daysAgo = Math.floor(Math.random() * 20) + 1
      const subscribedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      
      // Определяем дату окончания (30 дней от даты подписки)
      const validUntil = new Date(subscribedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: subscriber.id,
          creatorId: creator.id,
          plan: plan.name,
          price: plan.price,
          currency: 'SOL',
          subscribedAt: subscribedAt,
          validUntil: validUntil,
          isActive: validUntil > new Date()
        }
      })
      
      subscriptions.push(subscription)
      console.log(`Создана подписка: ${subscriber.nickname} -> ${creator.nickname} (${plan.name})`)
    }
    
    console.log(`\nВсего создано подписок: ${subscriptions.length}`)
    
  } catch (error) {
    console.error('Ошибка при создании подписок:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestSubscriptions() 