const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPostPurchases() {
  try {
    // Получаем последние покупки постов
    const purchases = await prisma.postPurchase.findMany({
      include: {
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            mediaUrl: true,
            isLocked: true
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            wallet: true
          }
        }
      },
      orderBy: { purchasedAt: 'desc' },
      take: 10
    })

    console.log(`Found ${purchases.length} recent post purchases\n`)

    purchases.forEach(purchase => {
      console.log(`Purchase ID: ${purchase.id}`)
      console.log(`User: ${purchase.user.nickname || purchase.user.wallet}`)
      console.log(`Post: ${purchase.post.title}`)
      console.log(`Price: ${purchase.price} ${purchase.currency}`)
      console.log(`Payment Status: ${purchase.paymentStatus}`)
      console.log(`TX Signature: ${purchase.txSignature || 'N/A'}`)
      console.log(`Purchased At: ${purchase.purchasedAt}`)
      console.log('---')
    })

    // Проверяем посты с покупками
    const postsWithPurchases = await prisma.post.findMany({
      where: {
        purchases: {
          some: {}
        }
      },
      include: {
        _count: {
          select: { purchases: true }
        }
      },
      take: 10
    })

    console.log(`\nPosts with purchases:`)
    postsWithPurchases.forEach(post => {
      console.log(`- "${post.title}" - ${post._count.purchases} purchases`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPostPurchases() 