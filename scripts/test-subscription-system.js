const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSubscriptionSystem() {
  try {
    console.log('🧪 Testing Subscription System...\n')
    
    // Get all users with locked posts
    const creatorsWithLockedPosts = await prisma.user.findMany({
      where: {
        posts: {
          some: {
            isLocked: true
          }
        }
      },
      include: {
        posts: {
          where: { isLocked: true },
          select: { id: true, title: true, isLocked: true }
        }
      }
    })
    
    console.log(`📝 Found ${creatorsWithLockedPosts.length} creators with locked posts:`)
    creatorsWithLockedPosts.forEach(creator => {
      console.log(`\n👤 ${creator.nickname} (${creator.id})`)
      console.log(`   Has ${creator.posts.length} locked posts`)
    })
    
    // Check active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      }
    })
    
    console.log(`\n✅ Active subscriptions: ${activeSubscriptions.length}`)
    activeSubscriptions.forEach(sub => {
      console.log(`   ${sub.user.nickname} → ${sub.creator.nickname} (${sub.plan}, expires: ${sub.validUntil.toLocaleDateString()})`)
    })
    
    // Check expired subscriptions that need renewal
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          { isActive: false },
          { validUntil: { lt: new Date() } }
        ]
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      }
    })
    
    if (expiredSubscriptions.length > 0) {
      console.log(`\n⚠️  Expired/Inactive subscriptions: ${expiredSubscriptions.length}`)
      expiredSubscriptions.forEach(sub => {
        console.log(`   ${sub.user.nickname} → ${sub.creator.nickname} (expired: ${sub.validUntil.toLocaleDateString()})`)
      })
    }
    
    // Test specific case: check if subscribers can access locked content
    console.log('\n🔐 Testing access to locked content:')
    
    for (const sub of activeSubscriptions) {
      const lockedPosts = await prisma.post.findMany({
        where: {
          creatorId: sub.creatorId,
          isLocked: true
        },
        select: { id: true, title: true }
      })
      
      if (lockedPosts.length > 0) {
        console.log(`\n   ${sub.user.nickname} should have access to ${lockedPosts.length} locked posts by ${sub.creator.nickname}`)
      }
    }
    
    console.log('\n✅ System check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSubscriptionSystem() 