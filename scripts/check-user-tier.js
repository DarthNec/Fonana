const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserTier() {
  try {
    // Найти пользователя dogwater
    const user = await prisma.user.findFirst({
      where: { nickname: 'dogwater' }
    })
    
    if (!user) {
      console.log('Пользователь dogwater не найден')
      return
    }
    
    console.log('=== Пользователь dogwater ===')
    console.log('ID:', user.id)
    console.log('Wallet:', user.wallet)
    
    // Найти активные подписки
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        creator: {
          select: {
            nickname: true,
            wallet: true
          }
        }
      }
    })
    
    console.log('\n=== Активные подписки ===')
    for (const sub of subscriptions) {
      console.log(`- Автор: ${sub.creator.nickname || sub.creator.wallet}`)
      console.log(`  План: ${sub.plan}`)
      console.log(`  Цена: ${sub.price} SOL`)
      console.log(`  Действует до: ${sub.validUntil}`)
    }
    
    // Найти автора yourdad
    const creator = await prisma.user.findFirst({
      where: { nickname: 'yourdad' }
    })
    
    if (creator) {
      console.log('\n=== Автор yourdad ===')
      console.log('ID:', creator.id)
      
      // Найти посты с VIP тиром
      const vipPosts = await prisma.post.findMany({
        where: {
          creatorId: creator.id,
          minSubscriptionTier: 'vip'
        },
        select: {
          id: true,
          title: true,
          isLocked: true,
          minSubscriptionTier: true,
          createdAt: true
        }
      })
      
      console.log('\n=== VIP посты yourdad ===')
      if (vipPosts.length === 0) {
        console.log('VIP постов не найдено')
      } else {
        for (const post of vipPosts) {
          console.log(`- "${post.title}"`)
          console.log(`  ID: ${post.id}`)
          console.log(`  Заблокирован: ${post.isLocked}`)
          console.log(`  Минимальный тир: ${post.minSubscriptionTier}`)
          console.log(`  Создан: ${post.createdAt}`)
        }
      }
      
      // Проверить подписку dogwater на yourdad
      const subToYourdad = subscriptions.find(s => s.creatorId === creator.id)
      if (subToYourdad) {
        console.log(`\n=== Подписка dogwater на yourdad: ${subToYourdad.plan} ===`)
        console.log('Доступ к VIP контенту:', subToYourdad.plan.toLowerCase() === 'vip' ? 'ДА' : 'НЕТ')
      } else {
        console.log('\n=== Подписка dogwater на yourdad: НЕТ ===')
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserTier() 