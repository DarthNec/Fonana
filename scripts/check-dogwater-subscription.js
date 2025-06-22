const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDogwaterSubscription() {
  try {
    // Найдем пользователей
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' },
      select: { id: true, nickname: true, wallet: true, solanaWallet: true }
    })
    
    const vizer36 = await prisma.user.findFirst({ 
      where: { nickname: 'vizer36' },
      select: { id: true, nickname: true, wallet: true, solanaWallet: true }
    })
    
    console.log('=== USERS ===')
    console.log('Dogwater:', dogwater)
    console.log('Vizer36:', vizer36)
    
    if (!dogwater || !vizer36) {
      console.error('Users not found!')
      return
    }
    
    // Проверим все подписки Dogwater на vizer36
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: dogwater.id,
        creatorId: vizer36.id
      },
      orderBy: { subscribedAt: 'desc' }
    })
    
    console.log('\n=== ALL SUBSCRIPTIONS ===')
    subscriptions.forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1}:`, {
        id: sub.id,
        plan: sub.plan,
        price: sub.price,
        isActive: sub.isActive,
        subscribedAt: sub.subscribedAt,
        validUntil: sub.validUntil,
        paymentStatus: sub.paymentStatus,
        txSignature: sub.txSignature
      })
    })
    
    // Найдем активную подписку
    const activeSubscription = subscriptions.find(s => s.isActive)
    console.log('\n=== ACTIVE SUBSCRIPTION ===')
    console.log(activeSubscription || 'No active subscription found')
    
    // Проверим транзакции для всех подписок
    console.log('\n=== TRANSACTIONS ===')
    for (const sub of subscriptions) {
      const transaction = await prisma.transaction.findFirst({
        where: { subscriptionId: sub.id }
      })
      if (transaction) {
        console.log(`\nTransaction for subscription ${sub.id}:`, {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          type: transaction.type,
          txSignature: transaction.txSignature,
          confirmedAt: transaction.confirmedAt,
          createdAt: transaction.createdAt
        })
      }
    }
    
    // Проверим настройки тиров vizer36
    const tierSettings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId: vizer36.id }
    })
    
    console.log('\n=== VIZER36 TIER SETTINGS ===')
    console.log(tierSettings)
    
    // Проверим несколько постов vizer36
    const posts = await prisma.post.findMany({
      where: { creatorId: vizer36.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        minSubscriptionTier: true,
        isPremium: true,
        isLocked: true,
        price: true
      }
    })
    
    console.log('\n=== VIZER36 RECENT POSTS ===')
    posts.forEach((post, index) => {
      console.log(`\nPost ${index + 1}:`, {
        id: post.id,
        title: post.title,
        minSubscriptionTier: post.minSubscriptionTier,
        isPremium: post.isPremium,
        isLocked: post.isLocked,
        price: post.price
      })
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDogwaterSubscription() 