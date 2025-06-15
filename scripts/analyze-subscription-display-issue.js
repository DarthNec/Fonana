const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeIssue() {
  try {
    console.log('=== АНАЛИЗ ПРОБЛЕМЫ ОТОБРАЖЕНИЯ ПОДПИСОК ===\n')
    
    // 1. Проверяем данные Pal в таблице users
    const pal = await prisma.user.findFirst({
      where: { nickname: 'Pal' }
    })
    
    console.log('1. Данные Pal в базе:')
    console.log('- ID:', pal?.id)
    console.log('- Nickname:', pal?.nickname)
    console.log('- isCreator:', pal?.isCreator)
    console.log('- Wallet:', pal?.wallet)
    
    if (!pal?.isCreator) {
      console.log('\n⚠️  ПРОБЛЕМА: Pal не отмечен как creator!')
    }
    
    // 2. Проверяем, возвращается ли Pal в списке creators
    const creators = await prisma.user.findMany({
      where: { isCreator: true },
      select: {
        id: true,
        nickname: true,
        wallet: true
      }
    })
    
    console.log('\n2. Список всех creators:')
    console.log(`Всего creators: ${creators.length}`)
    const palInCreators = creators.find(c => c.id === pal?.id)
    console.log('Pal в списке creators:', palInCreators ? 'ДА' : 'НЕТ')
    
    // 3. Проверяем подписку Dogwater на Pal
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    console.log('\n3. Проверка подписки Dogwater на Pal:')
    
    const subscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: dogwater.id,
          creatorId: pal.id
        }
      }
    })
    
    if (subscription) {
      console.log('✅ Подписка существует:')
      console.log('- Активна:', subscription.isActive)
      console.log('- Действует до:', subscription.validUntil)
      console.log('- Статус платежа:', subscription.paymentStatus)
      console.log('- Активная по API логике:', subscription.isActive && subscription.validUntil > new Date())
    } else {
      console.log('❌ Подписка не найдена')
    }
    
    // 4. Проверяем, что вернет API /api/subscriptions/check
    const activeSubs = await prisma.subscription.findMany({
      where: {
        userId: dogwater.id,
        isActive: true,
        validUntil: { gt: new Date() }
      },
      select: {
        creatorId: true,
        creator: {
          select: {
            nickname: true
          }
        }
      }
    })
    
    console.log('\n4. Активные подписки Dogwater (как вернет API):')
    console.log(`Всего активных: ${activeSubs.length}`)
    const subscribedCreatorIds = activeSubs.map(s => s.creatorId)
    console.log('Creator IDs:', subscribedCreatorIds)
    console.log('Включает Pal?', subscribedCreatorIds.includes(pal.id))
    
    activeSubs.forEach(sub => {
      console.log(`- ${sub.creator.nickname} (${sub.creatorId})`)
    })
    
    // 5. Проверим посты Pal
    const palPosts = await prisma.post.count({
      where: { creatorId: pal.id }
    })
    
    console.log(`\n5. Количество постов Pal: ${palPosts}`)
    
    // 6. Возможные причины
    console.log('\n=== ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ ===')
    
    if (!pal?.isCreator) {
      console.log('❌ Pal не отмечен как creator в базе данных')
    }
    
    if (!palInCreators) {
      console.log('❌ Pal не возвращается в списке creators из API')
    }
    
    if (!subscription || !subscription.isActive || subscription.validUntil < new Date()) {
      console.log('❌ Подписка неактивна или истекла')
    }
    
    if (!subscribedCreatorIds.includes(pal.id)) {
      console.log('❌ Pal не включен в список подписок через API')
    }
    
    console.log('\n=== РЕКОМЕНДАЦИИ ===')
    console.log('1. Проверьте консоль браузера для отладочных сообщений')
    console.log('2. Очистите localStorage и перезагрузите страницу')
    console.log('3. Проверьте сетевые запросы в DevTools')
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeIssue() 