const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testTierAccess() {
  try {
    console.log('=== Тестирование системы тиров ===\n')
    
    // Найти пользователей
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    const yourdad = await prisma.user.findFirst({
      where: { nickname: 'yourdad' }
    })
    
    if (!dogwater || !yourdad) {
      console.log('Пользователи не найдены')
      return
    }
    
    // Проверить подписку Dogwater на yourdad
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: dogwater.id,
        creatorId: yourdad.id,
        isActive: true,
        validUntil: { gte: new Date() }
      }
    })
    
    console.log(`Пользователь: Dogwater`)
    console.log(`Подписка на yourdad: ${subscription ? subscription.plan : 'НЕТ'}`)
    
    // Найти все посты yourdad с разными тирами
    const posts = await prisma.post.findMany({
      where: {
        creatorId: yourdad.id,
        isLocked: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\nПосты yourdad (заблокированные):\n`)
    
    const TIER_HIERARCHY = {
      'vip': 4,
      'premium': 3,
      'basic': 2,
      'free': 1
    }
    
    for (const post of posts) {
      const requiredTier = post.minSubscriptionTier || (post.isPremium ? 'vip' : null)
      const userTier = subscription?.plan.toLowerCase()
      
      let hasAccess = false
      if (!requiredTier) {
        // Обычный заблокированный пост - доступен любым подписчикам
        hasAccess = !!subscription
      } else if (userTier) {
        const userLevel = TIER_HIERARCHY[userTier] || 0
        const requiredLevel = TIER_HIERARCHY[requiredTier] || 0
        hasAccess = userLevel >= requiredLevel
      }
      
      console.log(`"${post.title}"`)
      console.log(`  Требуемый тир: ${requiredTier || 'Любая подписка'}`)
      console.log(`  Доступ для Dogwater (${userTier || 'нет подписки'}): ${hasAccess ? '✅ ДА' : '❌ НЕТ'}`)
      if (post.price) {
        console.log(`  Цена: ${post.price} ${post.currency}`)
      }
      console.log('')
    }
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTierAccess() 