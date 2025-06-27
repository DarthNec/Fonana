const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPurchaseFix() {
  try {
    console.log('🔍 Testing purchase fix after UserContext migration...\n')

    // 1. Проверяем последние транзакции покупок
    console.log('1. Checking recent post purchases:')
    const recentPurchases = await prisma.postPurchase.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, nickname: true, wallet: true }
        },
        post: {
          select: { id: true, title: true, price: true }
        },
        transaction: true
      }
    })

    if (recentPurchases.length === 0) {
      console.log('   No recent purchases found')
    } else {
      recentPurchases.forEach(purchase => {
        console.log(`   - User: ${purchase.user.nickname || 'Unknown'} (ID: ${purchase.user.id})`)
        console.log(`     Post: "${purchase.post.title}" (${purchase.post.price} SOL)`)
        console.log(`     Transaction: ${purchase.transaction?.txSignature || 'Not linked'}`)
        console.log(`     Status: ${purchase.transaction?.status || 'Unknown'}`)
        console.log(`     Created: ${purchase.createdAt.toLocaleString()}\n`)
      })
    }

    // 2. Проверяем транзакции без userId
    console.log('2. Checking for transactions with wallet instead of userId:')
    const transactionsWithWallet = await prisma.transaction.where({
      type: 'POST_PURCHASE',
      fromWallet: { not: null }
    }).findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        postPurchase: {
          include: {
            user: { select: { id: true, wallet: true } }
          }
        }
      }
    })

    let mismatchCount = 0
    transactionsWithWallet.forEach(tx => {
      if (tx.postPurchase && tx.fromWallet !== tx.postPurchase.user.wallet) {
        mismatchCount++
        console.log(`   ⚠️  Transaction ${tx.txSignature}`)
        console.log(`      From wallet: ${tx.fromWallet}`)
        console.log(`      User wallet: ${tx.postPurchase.user.wallet}`)
      }
    })

    if (mismatchCount === 0) {
      console.log('   ✅ All transactions have correct wallet mapping')
    } else {
      console.log(`   ❌ Found ${mismatchCount} mismatched transactions`)
    }

    // 3. Проверяем связь между покупками и пользователями
    console.log('\n3. Verifying user-purchase relationships:')
    const purchasesWithoutUser = await prisma.postPurchase.findMany({
      where: { userId: null }
    })

    if (purchasesWithoutUser.length > 0) {
      console.log(`   ❌ Found ${purchasesWithoutUser.length} purchases without userId`)
    } else {
      console.log('   ✅ All purchases have valid userId')
    }

    // 4. Проверяем последние неудачные транзакции
    console.log('\n4. Recent failed purchase attempts:')
    const failedTransactions = await prisma.transaction.findMany({
      where: {
        type: 'POST_PURCHASE',
        status: 'FAILED'
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        txSignature: true,
        errorMessage: true,
        createdAt: true,
        amount: true
      }
    })

    if (failedTransactions.length === 0) {
      console.log('   ✅ No recent failed transactions')
    } else {
      failedTransactions.forEach(tx => {
        console.log(`   - ${tx.txSignature.substring(0, 20)}...`)
        console.log(`     Amount: ${tx.amount} SOL`)
        console.log(`     Error: ${tx.errorMessage || 'Unknown error'}`)
        console.log(`     Date: ${tx.createdAt.toLocaleString()}\n`)
      })
    }

    console.log('\n✅ Purchase fix verification completed!')
    console.log('\nNext steps:')
    console.log('1. Test purchasing a post on localhost')
    console.log('2. Monitor console for correct userId in API calls')
    console.log('3. Verify transaction completion in database')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPurchaseFix() 