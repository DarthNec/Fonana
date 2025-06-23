const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeSubscriptionDisplayIssue() {
  try {
    console.log('=== SUBSCRIPTION DISPLAY ISSUE ANALYSIS ===\n')
    
    // 1. Проверяем lafufu и его настройки тиров
    const lafufu = await prisma.user.findFirst({
      where: { 
        nickname: { equals: 'lafufu', mode: 'insensitive' } 
      }
    })
    
    if (!lafufu) {
      console.log('Lafufu not found!')
      return
    }
    
    console.log('LAFUFU INFO:')
    console.log(`- ID: ${lafufu.id}`)
    console.log(`- Nickname: ${lafufu.nickname}`)
    console.log(`- Wallet: ${lafufu.solanaWallet || lafufu.wallet}\n`)
    
    // Проверяем настройки тиров
    const tierSettings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId: lafufu.id }
    })
    
    console.log('TIER SETTINGS:')
    if (tierSettings) {
      console.log('Custom tiers found:')
      console.log(JSON.stringify({
        basicTier: tierSettings.basicTier,
        premiumTier: tierSettings.premiumTier,
        vipTier: tierSettings.vipTier
      }, null, 2))
    } else {
      console.log('❌ NO CUSTOM TIERS - Using default prices (0.05, 0.15, 0.35)')
    }
    
    // 2. Проверяем подписки на lafufu
    console.log('\n\nSUBSCRIPTIONS TO LAFUFU:')
    const subscriptions = await prisma.subscription.findMany({
      where: { 
        creatorId: lafufu.id,
        isActive: true
      },
      include: {
        user: {
          select: { nickname: true, wallet: true, solanaWallet: true }
        }
      },
      orderBy: { subscribedAt: 'desc' },
      take: 10
    })
    
    subscriptions.forEach(sub => {
      console.log(`\n- User: ${sub.user.nickname}`)
      console.log(`  Plan: ${sub.plan}`)
      console.log(`  Price: ${sub.price} SOL`)
      console.log(`  Valid until: ${sub.validUntil}`)
      console.log(`  Subscribed: ${sub.subscribedAt}`)
    })
    
    // 3. Ищем специфично подписку Dogwater на lafufu
    const dogwater = await prisma.user.findFirst({
      where: { 
        nickname: { equals: 'Dogwater', mode: 'insensitive' } 
      }
    })
    
    if (dogwater) {
      console.log('\n\nDOGWATER SUBSCRIPTION TO LAFUFU:')
      const dogwaterSub = await prisma.subscription.findUnique({
        where: {
          userId_creatorId: {
            userId: dogwater.id,
            creatorId: lafufu.id
          }
        }
      })
      
      if (dogwaterSub) {
        console.log(`- Current Plan: ${dogwaterSub.plan}`)
        console.log(`- Price Paid: ${dogwaterSub.price} SOL`)
        console.log(`- Is Active: ${dogwaterSub.isActive}`)
        console.log(`- Valid Until: ${dogwaterSub.validUntil}`)
        console.log(`- TX Signature: ${dogwaterSub.txSignature?.slice(0, 20)}...`)
        
        // Проверяем транзакции
        const transaction = await prisma.transaction.findUnique({
          where: { txSignature: dogwaterSub.txSignature || '' }
        })
        
        if (transaction) {
          console.log('\nTRANSACTION DETAILS:')
          console.log(`- Amount: ${transaction.amount} SOL`)
          console.log(`- Type: ${transaction.type}`)
          console.log(`- Status: ${transaction.status}`)
          console.log(`- Metadata: ${JSON.stringify(transaction.metadata)}`)
        }
      } else {
        console.log('No subscription found')
      }
    }
    
    // 4. Проверяем последние транзакции подписок для lafufu
    console.log('\n\nLAST 5 SUBSCRIPTION TRANSACTIONS TO LAFUFU:')
    const recentTxs = await prisma.transaction.findMany({
      where: {
        type: 'SUBSCRIPTION',
        metadata: {
          path: ['creatorId'],
          equals: lafufu.id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    recentTxs.forEach(tx => {
      const metadata = tx.metadata
      console.log(`\n- TX: ${tx.txSignature?.slice(0, 20)}...`)
      console.log(`  Plan: ${metadata?.plan}`)
      console.log(`  Amount: ${tx.amount} SOL`)
      console.log(`  Created: ${tx.createdAt}`)
      console.log(`  Status: ${tx.status}`)
    })
    
  } catch (error) {
    console.error('Analysis error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeSubscriptionDisplayIssue() 