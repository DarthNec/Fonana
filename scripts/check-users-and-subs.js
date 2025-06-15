const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsersAndSubs() {
  try {
    // Найти всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        wallet: true
      }
    })
    
    console.log('=== Все пользователи ===')
    for (const user of users) {
      console.log(`${user.nickname || 'No nickname'} (${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)})`)
    }
    
    // Найти все активные подписки с ценой 0.05 SOL
    const cheapSubs = await prisma.subscription.findMany({
      where: {
        price: 0.05,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        user: {
          select: {
            nickname: true,
            wallet: true
          }
        },
        creator: {
          select: {
            nickname: true,
            wallet: true
          }
        }
      }
    })
    
    console.log('\n=== Подписки за 0.05 SOL ===')
    for (const sub of cheapSubs) {
      console.log(`Пользователь: ${sub.user.nickname || sub.user.wallet.slice(0, 6)}`)
      console.log(`Подписан на: ${sub.creator.nickname || sub.creator.wallet.slice(0, 6)}`)
      console.log(`План: ${sub.plan}`)
      console.log('---')
    }
    
    // Найти посты с VIP тиром
    const vipPosts = await prisma.post.findMany({
      where: {
        minSubscriptionTier: 'vip'
      },
      include: {
        creator: {
          select: {
            nickname: true,
            wallet: true
          }
        }
      }
    })
    
    console.log('\n=== Посты с VIP тиром ===')
    for (const post of vipPosts) {
      console.log(`"${post.title}" - автор: ${post.creator.nickname || post.creator.wallet.slice(0, 6)}`)
      console.log(`ID: ${post.id}`)
      console.log(`Заблокирован: ${post.isLocked}`)
      console.log('---')
    }
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersAndSubs() 