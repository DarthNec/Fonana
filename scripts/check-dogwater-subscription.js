const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDogwaterSubscription() {
  try {
    console.log('🔍 Checking Dogwater subscription to billyonair...\n')
    
    // Найти пользователя Dogwater
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' },
      select: { id: true, nickname: true, wallet: true }
    })
    
    if (!dogwater) {
      console.log('❌ User Dogwater not found')
      return
    }
    
    console.log('✅ Found Dogwater:', dogwater.id)
    
    // Найти пользователя billyonair
    const billyonair = await prisma.user.findFirst({
      where: { nickname: 'billyonair' },
      select: { id: true, nickname: true, wallet: true }
    })
    
    if (!billyonair) {
      console.log('❌ User billyonair not found')
      return
    }
    
    console.log('✅ Found billyonair:', billyonair.id)
    
    // Проверить подписку
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: dogwater.id,
        creatorId: billyonair.id,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      select: {
        id: true,
        plan: true,
        price: true,
        currency: true,
        subscribedAt: true,
        validUntil: true,
        isActive: true
      }
    })
    
    if (!subscription) {
      console.log('❌ No active subscription found')
    } else {
      console.log('\n📊 Subscription Details:')
      console.log('   ID:', subscription.id)
      console.log('   Plan:', subscription.plan)
      console.log('   Price:', subscription.price, subscription.currency)
      console.log('   Subscribed at:', subscription.subscribedAt)
      console.log('   Valid until:', subscription.validUntil)
      console.log('   Active:', subscription.isActive)
    }
    
    // Найти sellable посты billyonair
    const sellablePosts = await prisma.post.findMany({
      where: {
        creatorId: billyonair.id,
        isSellable: true
      },
      select: {
        id: true,
        title: true,
        isLocked: true,
        minSubscriptionTier: true,
        price: true,
        sellType: true,
        soldAt: true,
        soldToId: true
      }
    })
    
    console.log('\n📝 Sellable posts by billyonair:')
    for (const post of sellablePosts) {
      console.log(`\n   Post: "${post.title}" (${post.id})`)
      console.log('   - Locked:', post.isLocked)
      console.log('   - Required tier:', post.minSubscriptionTier || 'None')
      console.log('   - Price:', post.price)
      console.log('   - Type:', post.sellType)
      console.log('   - Sold:', post.soldAt ? 'Yes' : 'No')
      
      // Проверить доступ
      if (post.isLocked && post.minSubscriptionTier && subscription) {
        const TIER_HIERARCHY = {
          'vip': 4,
          'premium': 3,
          'basic': 2,
          'free': 1
        }
        
        const userLevel = TIER_HIERARCHY[subscription.plan.toLowerCase()] || 0
        const requiredLevel = TIER_HIERARCHY[post.minSubscriptionTier.toLowerCase()] || 0
        const hasAccess = userLevel >= requiredLevel
        
        console.log('   - User tier level:', userLevel, `(${subscription.plan})`)
        console.log('   - Required tier level:', requiredLevel, `(${post.minSubscriptionTier})`)
        console.log('   - Should have access:', hasAccess ? '✅ YES' : '❌ NO')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDogwaterSubscription() 