const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixSubscriptionDisplay() {
  console.log('🔍 Analyzing subscription display issues...\n')

  try {
    // 1. Check users with null nicknames
    const usersWithNullNickname = await prisma.user.findMany({
      where: { nickname: null }
    })
    
    console.log(`⚠️  Found ${usersWithNullNickname.length} users with null nickname`)
    
    if (usersWithNullNickname.length > 0) {
      console.log('\nUsers with null nickname:')
      usersWithNullNickname.forEach(user => {
        console.log(`   - ID: ${user.id}, Wallet: ${user.wallet.slice(0, 8)}...`)
      })
    }

    // 2. Check subscriptions with null user nicknames
    const subsWithNullUserNickname = await prisma.subscription.findMany({
      where: {
        user: { nickname: null }
      },
      include: {
        user: { select: { id: true, wallet: true, nickname: true } },
        creator: { select: { id: true, nickname: true } }
      }
    })
    
    console.log(`\n📊 Subscriptions where user has null nickname: ${subsWithNullUserNickname.length}`)
    
    // 3. Test API logic with real user
    console.log('\n🧪 Testing API subscription logic:')
    
    // Get Dogwater user
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    if (dogwater) {
      console.log(`\nTesting with Dogwater (ID: ${dogwater.id}):`)
      
      // Get active subscriptions
      const activeSubs = await prisma.subscription.findMany({
        where: {
          userId: dogwater.id,
          isActive: true,
          validUntil: { gte: new Date() }
        },
        include: {
          creator: { select: { id: true, nickname: true } }
        }
      })
      
      console.log(`Active subscriptions: ${activeSubs.length}`)
      activeSubs.forEach(sub => {
        console.log(`   - Subscribed to ${sub.creator.nickname} (Creator ID: ${sub.creatorId})`)
      })
      
      // Get locked posts from subscribed creators
      const subscribedCreatorIds = activeSubs.map(sub => sub.creatorId)
      
      const lockedPostsFromSubscribed = await prisma.post.findMany({
        where: {
          isLocked: true,
          creatorId: { in: subscribedCreatorIds }
        },
        include: {
          creator: { select: { nickname: true } }
        }
      })
      
      console.log(`\nLocked posts from subscribed creators: ${lockedPostsFromSubscribed.length}`)
      lockedPostsFromSubscribed.forEach(post => {
        console.log(`   - "${post.title}" by ${post.creator.nickname}`)
      })
    }

    // 4. Check the actual data flow
    console.log('\n📝 Checking data flow for feed:')
    
    // Simulate what happens in the API
    const testUserWallet = dogwater?.wallet
    if (testUserWallet) {
      // Get user by wallet (like in API)
      const userByWallet = await prisma.user.findUnique({
        where: { wallet: testUserWallet }
      })
      
      console.log(`\nUser lookup by wallet ${testUserWallet.slice(0, 8)}...:`)
      console.log(`   - Found: ${userByWallet ? 'Yes' : 'No'}`)
      if (userByWallet) {
        console.log(`   - ID: ${userByWallet.id}`)
        console.log(`   - Nickname: ${userByWallet.nickname}`)
      }
      
      // Get subscriptions
      if (userByWallet) {
        const subs = await prisma.subscription.findMany({
          where: {
            userId: userByWallet.id,
            isActive: true,
            validUntil: { gte: new Date() }
          },
          select: { creatorId: true }
        })
        
        console.log(`   - Active subscriptions: ${subs.length}`)
        console.log(`   - Subscribed to creators: ${subs.map(s => s.creatorId).join(', ')}`)
      }
    }

    // 5. Check specific problematic posts
    console.log('\n🔍 Checking specific locked posts visibility:')
    
    // Get all locked posts
    const allLockedPosts = await prisma.post.findMany({
      where: { isLocked: true },
      include: {
        creator: { select: { id: true, nickname: true } }
      },
      take: 5
    })
    
    if (dogwater && activeSubs) {
      const subscribedCreatorIds = activeSubs.map(sub => sub.creatorId)
      
      allLockedPosts.forEach(post => {
        const isSubscribed = subscribedCreatorIds.includes(post.creatorId)
        const isOwnPost = post.creatorId === dogwater.id
        const shouldHideContent = post.isLocked && !isSubscribed && !isOwnPost
        
        console.log(`\nPost: "${post.title}" by ${post.creator.nickname}`)
        console.log(`   - Locked: ${post.isLocked}`)
        console.log(`   - Subscribed to creator: ${isSubscribed}`)
        console.log(`   - Own post: ${isOwnPost}`)
        console.log(`   - Should hide content: ${shouldHideContent}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixSubscriptionDisplay()
  .then(() => console.log('\n✅ Analysis completed'))
  .catch(console.error) 