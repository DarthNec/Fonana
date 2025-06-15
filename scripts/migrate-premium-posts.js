const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migratePremiumPosts() {
  try {
    console.log('=== Миграция старых постов на систему тиров ===\n')
    
    // Найти все посты с isPremium=true без установленного minSubscriptionTier
    const premiumPosts = await prisma.post.findMany({
      where: {
        isPremium: true,
        minSubscriptionTier: null
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
    
    console.log(`Найдено ${premiumPosts.length} постов с isPremium=true без тира`)
    
    if (premiumPosts.length === 0) {
      console.log('Миграция не требуется!')
      return
    }
    
    console.log('\nБудут обновлены следующие посты:')
    for (const post of premiumPosts) {
      console.log(`- "${post.title}" (автор: ${post.creator.nickname || post.creator.wallet.slice(0, 6)})`)
    }
    
    console.log('\nНачинаю миграцию...')
    
    // Обновляем все посты с isPremium=true, устанавливая minSubscriptionTier='vip'
    const result = await prisma.post.updateMany({
      where: {
        isPremium: true,
        minSubscriptionTier: null
      },
      data: {
        minSubscriptionTier: 'vip'
      }
    })
    
    console.log(`\n✅ Успешно обновлено ${result.count} постов`)
    console.log('Теперь все посты с isPremium=true требуют VIP подписку')
    
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migratePremiumPosts() 