const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSubscriptionIssues() {
  console.log('🔍 Checking subscription issues...\n')

  try {
    // 1. Get all subscriptions
    const allSubscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: { id: true, nickname: true, wallet: true }
        },
        creator: {
          select: { id: true, nickname: true }
        }
      }
    })

    console.log(`📊 Total subscriptions: ${allSubscriptions.length}`)

    // 2. Check active but expired subscriptions
    const now = new Date()
    const expiredButActive = allSubscriptions.filter(sub => 
      sub.isActive && sub.validUntil < now
    )

    if (expiredButActive.length > 0) {
      console.log(`\n⚠️  Found ${expiredButActive.length} expired but still active subscriptions:`)
      expiredButActive.forEach(sub => {
        console.log(`   - ${sub.user.nickname} → ${sub.creator.nickname} (expired: ${sub.validUntil.toLocaleDateString()})`)
      })
    }

    // 3. Check inactive subscriptions
    const inactiveSubscriptions = allSubscriptions.filter(sub => !sub.isActive)
    console.log(`\n❌ Inactive subscriptions: ${inactiveSubscriptions.length}`)

    // 4. Check valid active subscriptions
    const validActiveSubscriptions = allSubscriptions.filter(sub => 
      sub.isActive && sub.validUntil >= now
    )
    console.log(`\n✅ Valid active subscriptions: ${validActiveSubscriptions.length}`)
    
    // Show some examples
    if (validActiveSubscriptions.length > 0) {
      console.log('\nExamples of valid subscriptions:')
      validActiveSubscriptions.slice(0, 5).forEach(sub => {
        console.log(`   - ${sub.user.nickname} → ${sub.creator.nickname} (valid until: ${sub.validUntil.toLocaleDateString()})`)
      })
    }

    // 5. Test specific user subscriptions
    console.log('\n📋 Testing specific users:')
    const testUsers = ['Dogwater', 'CryptoBob', 'FloorDecor']
    
    for (const username of testUsers) {
      const user = await prisma.user.findFirst({
        where: { nickname: username }
      })
      
      if (user) {
        const userSubs = await prisma.subscription.findMany({
          where: {
            userId: user.id,
            isActive: true,
            validUntil: { gte: now }
          },
          include: {
            creator: { select: { nickname: true } }
          }
        })
        
        console.log(`\n👤 ${username}:`)
        if (userSubs.length > 0) {
          userSubs.forEach(sub => {
            console.log(`   ✅ Subscribed to ${sub.creator.nickname} until ${sub.validUntil.toLocaleDateString()}`)
          })
        } else {
          console.log('   ❌ No active subscriptions')
        }
      }
    }

    // 6. Check for locked posts
    console.log('\n🔒 Checking locked posts:')
    const lockedPosts = await prisma.post.findMany({
      where: { isLocked: true },
      include: {
        creator: { select: { nickname: true } },
        _count: { select: { likes: true, comments: true } }
      }
    })
    
    console.log(`Total locked posts: ${lockedPosts.length}`)
    
    // Group by creator
    const postsByCreator = lockedPosts.reduce((acc, post) => {
      const creator = post.creator.nickname
      acc[creator] = (acc[creator] || 0) + 1
      return acc
    }, {})
    
    console.log('\nLocked posts by creator:')
    Object.entries(postsByCreator).forEach(([creator, count]) => {
      console.log(`   - ${creator}: ${count} posts`)
    })

    // 7. Test subscription check logic
    console.log('\n🧪 Testing subscription check logic:')
    
    // Test with Dogwater
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    if (dogwater) {
      // Get all creators Dogwater is subscribed to
      const dogwaterSubs = await prisma.subscription.findMany({
        where: {
          userId: dogwater.id,
          isActive: true,
          validUntil: { gte: now }
        },
        select: { creatorId: true }
      })
      
      const subscribedCreatorIds = dogwaterSubs.map(sub => sub.creatorId)
      
      // Check some locked posts
      const someLocked = await prisma.post.findMany({
        where: { isLocked: true },
        take: 10,
        include: {
          creator: { select: { id: true, nickname: true } }
        }
      })
      
      console.log(`\nChecking if Dogwater should see locked posts:`)
      someLocked.forEach(post => {
        const isSubscribed = subscribedCreatorIds.includes(post.creatorId)
        const shouldSee = !post.isLocked || isSubscribed || post.creatorId === dogwater.id
        console.log(`   - Post by ${post.creator.nickname}: ${shouldSee ? '✅ Should see' : '❌ Should be hidden'} (subscribed: ${isSubscribed})`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkSubscriptionIssues()
  .then(() => console.log('\n✅ Check completed'))
  .catch(console.error) 