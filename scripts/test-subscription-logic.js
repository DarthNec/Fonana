const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSubscriptionLogic() {
  console.log('🧪 Testing subscription logic...\n')

  try {
    // 1. Get test user
    const testUser = await prisma.user.findFirst({
      where: {
        nickname: 'user_test_loc'
      }
    })
    
    if (!testUser) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log(`✅ Found test user: ${testUser.nickname} (${testUser.wallet})\n`)
    
    // 2. Get user's active subscriptions
    const now = new Date()
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
        validUntil: { gte: now }
      },
      include: {
        creator: { select: { nickname: true, id: true } }
      }
    })
    
    console.log(`📊 Active subscriptions: ${activeSubscriptions.length}`)
    const subscribedCreatorIds = activeSubscriptions.map(sub => sub.creatorId)
    
    activeSubscriptions.forEach(sub => {
      console.log(`   ✅ ${sub.creator.nickname} (until ${sub.validUntil.toLocaleDateString()})`)
    })
    
    // 3. Get all locked posts
    console.log('\n🔒 Testing locked posts visibility:')
    
    const lockedPosts = await prisma.post.findMany({
      where: { isLocked: true },
      include: {
        creator: { select: { id: true, nickname: true } }
      }
    })
    
    console.log(`Total locked posts: ${lockedPosts.length}\n`)
    
    // 4. Simulate API logic for each post
    lockedPosts.forEach(post => {
      const isCreatorPost = testUser.id === post.creatorId
      const isSubscribed = subscribedCreatorIds.includes(post.creatorId)
      const shouldHideContent = post.isLocked && !isSubscribed && !isCreatorPost
      
      const status = shouldHideContent ? '❌ HIDDEN' : '✅ VISIBLE'
      const reason = isCreatorPost ? '(own post)' : isSubscribed ? '(subscribed)' : '(not subscribed)'
      
      console.log(`${status} "${post.title}" by ${post.creator.nickname} ${reason}`)
    })
    
    // 5. Test API endpoint directly
    console.log('\n🌐 Testing API endpoint:')
    
    // Simulate API call
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
        validUntil: { gte: now }
      },
      select: { creatorId: true }
    })
    
    const apiSubscribedCreatorIds = subscriptions.map(sub => sub.creatorId)
    console.log(`API would return ${apiSubscribedCreatorIds.length} active subscriptions`)
    
    // 6. Summary
    console.log('\n📈 Summary:')
    console.log(`- User: ${testUser.nickname}`)
    console.log(`- Active subscriptions: ${activeSubscriptions.length}`)
    console.log(`- Locked posts total: ${lockedPosts.length}`)
    
    const visibleLocked = lockedPosts.filter(post => {
      const isCreatorPost = testUser.id === post.creatorId
      const isSubscribed = subscribedCreatorIds.includes(post.creatorId)
      return isCreatorPost || isSubscribed
    })
    
    console.log(`- Visible locked posts: ${visibleLocked.length}`)
    console.log(`- Hidden locked posts: ${lockedPosts.length - visibleLocked.length}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testSubscriptionLogic()
  .then(() => console.log('\n✅ Test completed'))
  .catch(console.error) 