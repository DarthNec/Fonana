const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPremiumSubscriptionIssues() {
  console.log('🔍 ПРОВЕРКА ПРОБЛЕМ С PREMIUM ПОДПИСКАМИ\n')
  
  try {
    // 1. Найдем все транзакции с metadata.plan = Premium за последние 7 дней
    console.log('1️⃣ ТРАНЗАКЦИИ С ПЛАНОМ PREMIUM:')
    const recentTxs = await prisma.transaction.findMany({
      where: {
        type: 'SUBSCRIPTION',
        status: 'CONFIRMED',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: {
        subscription: {
          include: {
            user: { select: { nickname: true } },
            creator: { 
              select: { 
                nickname: true,
                tierSettings: true
              } 
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Фильтруем транзакции где план в metadata = Premium
    const premiumTxs = recentTxs.filter(tx => {
      if (tx.metadata && typeof tx.metadata === 'object') {
        const metadata = tx.metadata
        return metadata.plan === 'Premium' || metadata.plan === 'premium'
      }
      return false
    })
    
    console.log(`Найдено ${premiumTxs.length} транзакций с планом Premium\n`)
    
    for (const tx of premiumTxs) {
      const sub = tx.subscription
      const metadata = tx.metadata
      
      console.log(`📌 ${sub.user.nickname} → ${sub.creator.nickname}:`)
      console.log(`  Транзакция: ${tx.txSignature.slice(0, 20)}...`)
      console.log(`  Дата: ${tx.createdAt.toISOString()}`)
      console.log(`  Сумма оплачена: ${tx.amount} SOL`)
      console.log(`  План в метаданных: "${metadata.plan}"`)
      console.log(`  План в подписке: "${sub.plan}"`)
      
      if (metadata.plan !== sub.plan) {
        console.log(`  ⚠️  НЕСООТВЕТСТВИЕ! План в транзакции "${metadata.plan}", а в подписке "${sub.plan}"`)
      }
      
      // Проверим кастомные цены
      if (sub.creator.tierSettings) {
        const settings = sub.creator.tierSettings
        console.log(`  Кастомные цены создателя:`)
        if (settings.basicTier) {
          const basic = typeof settings.basicTier === 'string' ? JSON.parse(settings.basicTier) : settings.basicTier
          console.log(`    Basic: ${basic.price} SOL`)
        }
        if (settings.premiumTier) {
          const premium = typeof settings.premiumTier === 'string' ? JSON.parse(settings.premiumTier) : settings.premiumTier
          console.log(`    Premium: ${premium.price} SOL`)
        }
        if (settings.vipTier) {
          const vip = typeof settings.vipTier === 'string' ? JSON.parse(settings.vipTier) : settings.vipTier
          console.log(`    VIP: ${vip.price} SOL`)
        }
      }
      console.log('')
    }
    
    // 2. Проверим подписки где цена соответствует Premium, но план не Premium
    console.log('\n2️⃣ ПОДПИСКИ С ЦЕНОЙ PREMIUM, НО ДРУГИМ ПЛАНОМ:')
    
    // Получаем все активные подписки
    const allSubs = await prisma.subscription.findMany({
      where: {
        isActive: true,
        paymentStatus: 'COMPLETED',
        price: { gte: 0.1 } // Premium обычно >= 0.15
      },
      include: {
        user: { select: { nickname: true } },
        creator: { 
          select: { 
            nickname: true,
            tierSettings: true
          } 
        }
      }
    })
    
    for (const sub of allSubs) {
      // Проверяем, соответствует ли цена плану
      let expectedPlan = null
      
      if (sub.creator.tierSettings) {
        const settings = sub.creator.tierSettings
        const basicTier = settings.basicTier ? (typeof settings.basicTier === 'string' ? JSON.parse(settings.basicTier) : settings.basicTier) : null
        const premiumTier = settings.premiumTier ? (typeof settings.premiumTier === 'string' ? JSON.parse(settings.premiumTier) : settings.premiumTier) : null
        const vipTier = settings.vipTier ? (typeof settings.vipTier === 'string' ? JSON.parse(settings.vipTier) : settings.vipTier) : null
        
        if (basicTier && Math.abs(sub.price - basicTier.price) < 0.001) {
          expectedPlan = 'Basic'
        } else if (premiumTier && Math.abs(sub.price - premiumTier.price) < 0.001) {
          expectedPlan = 'Premium'
        } else if (vipTier && Math.abs(sub.price - vipTier.price) < 0.001) {
          expectedPlan = 'VIP'
        }
      } else {
        // Стандартные цены
        if (Math.abs(sub.price - 0.05) < 0.001) {
          expectedPlan = 'Basic'
        } else if (Math.abs(sub.price - 0.15) < 0.001) {
          expectedPlan = 'Premium'
        } else if (Math.abs(sub.price - 0.35) < 0.001) {
          expectedPlan = 'VIP'
        }
      }
      
      if (expectedPlan && expectedPlan !== sub.plan) {
        console.log(`\n⚠️  ${sub.user.nickname} → ${sub.creator.nickname}:`)
        console.log(`  Цена: ${sub.price} SOL`)
        console.log(`  Текущий план: "${sub.plan}"`)
        console.log(`  Ожидаемый план по цене: "${expectedPlan}"`)
        console.log(`  ID подписки: ${sub.id}`)
      }
    }
    
    // 3. Рекомендации
    console.log('\n\n📋 ВЫВОДЫ:')
    console.log('1. Проблема может быть в изменении плана после создания транзакции')
    console.log('2. Или в автоматической коррекции плана по цене')
    console.log('3. Нужно проверить логику в /api/subscriptions/process-payment')
    console.log('4. Убедиться, что план из запроса сохраняется без изменений')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPremiumSubscriptionIssues() 