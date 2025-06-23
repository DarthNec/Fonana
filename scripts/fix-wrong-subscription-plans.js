const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixWrongSubscriptionPlans() {
  console.log('🔍 Searching for subscriptions with wrong plans...')
  
  try {
    // Найти все подписки с планом "Free" и ненулевой ценой
    const wrongSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: 'Free',
        price: {
          gt: 0
        }
      },
      include: {
        user: {
          select: {
            nickname: true
          }
        },
        creator: {
          select: {
            nickname: true,
            creatorTierSettings: true
          }
        }
      }
    })
    
    console.log(`\n❌ Found ${wrongSubscriptions.length} subscriptions with wrong plan "Free":\n`)
    
    for (const sub of wrongSubscriptions) {
      console.log(`User: ${sub.user.nickname} -> Creator: ${sub.creator.nickname}`)
      console.log(`Price: ${sub.price} SOL, Current plan: ${sub.plan}`)
      
      // Определить правильный план по цене и настройкам создателя
      let correctPlan = 'Basic' // по умолчанию
      
      // Проверяем кастомные цены создателя
      const tierSettings = sub.creator.creatorTierSettings
      if (tierSettings) {
        const basicTier = tierSettings.basicTier ? JSON.parse(tierSettings.basicTier) : null
        const premiumTier = tierSettings.premiumTier ? JSON.parse(tierSettings.premiumTier) : null
        const vipTier = tierSettings.vipTier ? JSON.parse(tierSettings.vipTier) : null
        
        if (basicTier?.enabled && Math.abs(sub.price - basicTier.price) < 0.001) {
          correctPlan = 'Basic'
        } else if (premiumTier?.enabled && Math.abs(sub.price - premiumTier.price) < 0.001) {
          correctPlan = 'Premium'
        } else if (vipTier?.enabled && Math.abs(sub.price - vipTier.price) < 0.001) {
          correctPlan = 'VIP'
        } else {
          // Если нет точного совпадения с кастомными ценами, используем стандартные
          if (Math.abs(sub.price - 0.05) < 0.001) {
            correctPlan = 'Basic'
          } else if (Math.abs(sub.price - 0.15) < 0.001 || Math.abs(sub.price - 0.2) < 0.001) {
            correctPlan = 'Premium'
          } else if (Math.abs(sub.price - 0.35) < 0.001 || Math.abs(sub.price - 0.4) < 0.001) {
            correctPlan = 'VIP'
          }
        }
      } else {
        // Стандартные цены
        if (Math.abs(sub.price - 0.05) < 0.001) {
          correctPlan = 'Basic'
        } else if (Math.abs(sub.price - 0.15) < 0.001) {
          correctPlan = 'Premium'
        } else if (Math.abs(sub.price - 0.35) < 0.001) {
          correctPlan = 'VIP'
        }
      }
      
      console.log(`➡️  Should be: ${correctPlan}\n`)
      
      // Исправляем план
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: correctPlan }
      })
    }
    
    if (wrongSubscriptions.length > 0) {
      console.log(`✅ Fixed ${wrongSubscriptions.length} subscriptions\n`)
    } else {
      console.log('✅ No wrong subscriptions found\n')
    }
    
    // Показать обновленную статистику
    const updatedStats = await prisma.subscription.groupBy({
      by: ['plan', 'creatorId'],
      where: {
        isActive: true
      },
      _count: true
    })
    
    console.log('📊 Updated subscription statistics:')
    const creatorIds = [...new Set(updatedStats.map(s => s.creatorId))]
    
    for (const creatorId of creatorIds) {
      const creator = await prisma.user.findUnique({
        where: { id: creatorId },
        select: { nickname: true }
      })
      
      console.log(`\n${creator.nickname}:`)
      const creatorStats = updatedStats.filter(s => s.creatorId === creatorId)
      for (const stat of creatorStats) {
        console.log(`  ${stat.plan}: ${stat._count} subscriptions`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixWrongSubscriptionPlans() 