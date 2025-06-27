import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPurchaseFlow() {
  console.log('🔍 Testing Purchase Modal Flow...\n')

  try {
    // 1. Найдем тестового пользователя
    const testUser = await prisma.user.findFirst({
      where: {
        wallet: { not: null },
        isCreator: true
      }
    })

    if (!testUser) {
      console.log('❌ No test user found')
      return
    }

    console.log('✅ Test user found:')
    console.log(`   ID: ${testUser.id}`)
    console.log(`   Wallet: ${testUser.wallet}`)
    console.log(`   Nickname: ${testUser.nickname}`)
    console.log('')

    // 2. Найдем платный пост
    const paidPost = await prisma.post.findFirst({
      where: {
        price: { gt: 0 },
        isLocked: true,
        creatorId: { not: testUser.id } // Не свой пост
      },
      include: {
        creator: true
      }
    })

    if (!paidPost) {
      console.log('❌ No paid post found')
      return
    }

    console.log('✅ Test post found:')
    console.log(`   ID: ${paidPost.id}`)
    console.log(`   Title: ${paidPost.title}`)
    console.log(`   Price: ${paidPost.price} ${paidPost.currency}`)
    console.log(`   Creator: ${paidPost.creator.nickname}`)
    console.log('')

    // 3. Проверим, что пользователь еще не купил этот пост
    const existingPurchase = await prisma.postPurchase.findUnique({
      where: {
        userId_postId: {
          userId: testUser.id,
          postId: paidPost.id
        }
      }
    })

    if (existingPurchase) {
      console.log('⚠️  User already purchased this post')
      console.log(`   Purchase ID: ${existingPurchase.id}`)
      console.log(`   Purchased at: ${existingPurchase.createdAt}`)
    } else {
      console.log('✅ User has not purchased this post yet')
    }

    console.log('\n📋 Summary:')
    console.log('   The PurchaseModal should receive:')
    console.log(`   - userId: "${testUser.wallet}" (wallet address)`)
    console.log(`   - postId: "${paidPost.id}"`)
    console.log(`   - creatorId: "${paidPost.creator.id}"`)
    console.log('\n   The API endpoint /api/posts/process-payment expects userId to be a wallet address.')
    console.log('   It will look up the user by wallet: user = await prisma.user.findUnique({ where: { wallet: userId } })')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPurchaseFlow() 