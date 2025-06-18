const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSellablePost() {
  try {
    console.log('🔍 Checking sellable post direct from database...\n')
    
    // Найти пост
    const post = await prisma.post.findUnique({
      where: { id: 'cmc1wba4q000yqoqhc48kf4b9' },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true
          }
        }
      }
    })
    
    if (!post) {
      console.log('❌ Post not found')
      return
    }
    
    console.log('📝 Post details:')
    console.log('Title:', post.title)
    console.log('Creator:', post.creator.nickname)
    console.log('Is locked:', post.isLocked)
    console.log('Is sellable:', post.isSellable)
    console.log('Sell type:', post.sellType)
    console.log('Price:', post.price)
    console.log('Min subscription tier:', post.minSubscriptionTier)
    console.log('Is premium:', post.isPremium)
    
    // Найти пользователя Dogwater
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    if (!dogwater) {
      console.log('\n❌ User Dogwater not found')
      return
    }
    
    console.log('\n👤 User Dogwater found:', dogwater.id)
    
    // Проверить подписку
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: dogwater.id,
        creatorId: post.creator.id,
        isActive: true,
        validUntil: { gte: new Date() }
      }
    })
    
    if (!subscription) {
      console.log('❌ No active subscription')
    } else {
      console.log('✅ Active subscription:', subscription.plan)
    }
    
    // Логика проверки доступа
    console.log('\n🔐 Access logic:')
    
    const TIER_HIERARCHY = {
      'vip': 4,
      'premium': 3,
      'basic': 2,
      'free': 1
    }
    
    if (post.isLocked) {
      console.log('Post is locked')
      
      if (post.isSellable && post.minSubscriptionTier) {
        console.log('This is a sellable post with tier requirement')
        const userLevel = subscription ? TIER_HIERARCHY[subscription.plan.toLowerCase()] || 0 : 0
        const requiredLevel = TIER_HIERARCHY[post.minSubscriptionTier.toLowerCase()] || 0
        
        console.log(`User tier: ${subscription?.plan || 'None'} (level ${userLevel})`)
        console.log(`Required tier: ${post.minSubscriptionTier} (level ${requiredLevel})`)
        console.log(`Has access: ${userLevel >= requiredLevel ? '✅ YES' : '❌ NO'}`)
      } else if (post.minSubscriptionTier) {
        console.log('Regular post with tier requirement')
        const userLevel = subscription ? TIER_HIERARCHY[subscription.plan.toLowerCase()] || 0 : 0
        const requiredLevel = TIER_HIERARCHY[post.minSubscriptionTier.toLowerCase()] || 0
        
        console.log(`User tier: ${subscription?.plan || 'None'} (level ${userLevel})`)
        console.log(`Required tier: ${post.minSubscriptionTier} (level ${requiredLevel})`)
        console.log(`Has access: ${userLevel >= requiredLevel ? '✅ YES' : '❌ NO'}`)
      }
    } else {
      console.log('Post is not locked - everyone has access')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSellablePost() 