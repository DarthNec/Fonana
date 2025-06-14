const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkRealUsersSubs() {
  console.log('🔍 Checking real users and their subscriptions...\n')

  try {
    // 1. Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        wallet: true,
        isCreator: true,
        _count: {
          select: {
            posts: true,
            subscriptions: true
          }
        }
      }
    })
    
    console.log(`👥 Total users: ${allUsers.length}`)
    console.log('\nAll users:')
    allUsers.forEach(user => {
      console.log(`   - ${user.nickname || 'NO_NICKNAME'} (${user.wallet.slice(0, 8)}...) - Creator: ${user.isCreator}, Posts: ${user._count.posts}, Subscriptions: ${user._count.subscriptions}`)
    })

    // 2. Get users with subscriptions
    const usersWithSubs = allUsers.filter(u => u._count.subscriptions > 0)
    console.log(`\n👥 Users with subscriptions: ${usersWithSubs.length}`)

    // 3. Check each user's subscriptions in detail
    for (const user of usersWithSubs) {
      console.log(`\n📋 ${user.nickname || 'NO_NICKNAME'} subscriptions:`)
      
      const userSubs = await prisma.subscription.findMany({
        where: { userId: user.id },
        include: {
          creator: { select: { nickname: true } }
        }
      })
      
      userSubs.forEach(sub => {
        const status = sub.isActive && sub.validUntil >= new Date() ? '✅ Active' : '❌ Expired/Inactive'
        console.log(`   ${status} → ${sub.creator.nickname} (until ${sub.validUntil.toLocaleDateString()})`)
      })
    }

    // 4. Check locked posts visibility logic
    console.log('\n🔒 Testing locked posts visibility:')
    
    // Get a user with active subscriptions
    const testUser = await prisma.user.findFirst({
      where: {
        subscriptions: {
          some: {
            isActive: true,
            validUntil: { gte: new Date() }
          }
        }
      }
    })
    
    if (testUser) {
      console.log(`\nTesting with user: ${testUser.nickname || testUser.wallet.slice(0, 8)}`)
      
      // Get their active subscriptions
      const activeSubs = await prisma.subscription.findMany({
        where: {
          userId: testUser.id,
          isActive: true,
          validUntil: { gte: new Date() }
        },
        include: {
          creator: { select: { id: true, nickname: true } }
        }
      })
      
      console.log(`Active subscriptions: ${activeSubs.length}`)
      const subscribedCreatorIds = activeSubs.map(sub => sub.creatorId)
      
      // Get some locked posts
      const lockedPosts = await prisma.post.findMany({
        where: { isLocked: true },
        include: {
          creator: { select: { id: true, nickname: true } }
        },
        take: 10
      })
      
      console.log(`\nChecking ${lockedPosts.length} locked posts:`)
      lockedPosts.forEach(post => {
        const isSubscribed = subscribedCreatorIds.includes(post.creatorId)
        const shouldShow = isSubscribed || post.creatorId === testUser.id
        
        console.log(`   - "${post.title}" by ${post.creator.nickname}: ${shouldShow ? '✅ Should see' : '❌ Should be hidden'}`)
      })
    }

    // 5. Check the API logic simulation
    console.log('\n🔍 Simulating API getUserByWallet:')
    
    // Pick a user with subscriptions
    const userWithSubs = usersWithSubs[0]
    if (userWithSubs) {
      console.log(`\nTesting with wallet: ${userWithSubs.wallet}`)
      
      // Simulate getUserByWallet
      const foundUser = await prisma.user.findUnique({
        where: { wallet: userWithSubs.wallet }
      })
      
      console.log(`Found user: ${foundUser ? 'Yes' : 'No'}`)
      if (foundUser) {
        console.log(`   - ID: ${foundUser.id}`)
        console.log(`   - Nickname: ${foundUser.nickname}`)
        
        // Get subscriptions like in API
        const subs = await prisma.subscription.findMany({
          where: {
            userId: foundUser.id,
            isActive: true,
            validUntil: { gte: new Date() }
          },
          select: { creatorId: true }
        })
        
        console.log(`   - Active subscriptions: ${subs.length}`)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkRealUsersSubs()
  .then(() => console.log('\n✅ Check completed'))
  .catch(console.error) 