const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSubscription() {
  try {
    console.log('=== Проверка подписки Dogwater на Pal ===\n')
    
    // Найти пользователей
    const dogwater = await prisma.user.findFirst({
      where: { nickname: 'Dogwater' }
    })
    
    const pal = await prisma.user.findFirst({
      where: { nickname: 'Pal' }
    })
    
    console.log('Dogwater:')
    console.log('- ID:', dogwater?.id)
    console.log('- Nickname:', dogwater?.nickname)
    console.log('- Wallet:', dogwater?.wallet)
    
    console.log('\nPal:')
    console.log('- ID:', pal?.id)
    console.log('- Nickname:', pal?.nickname)
    console.log('- Wallet:', pal?.wallet)
    console.log('- isCreator:', pal?.isCreator)
    
    if (!dogwater || !pal) {
      console.log('\n❌ Один из пользователей не найден!')
      return
    }
    
    // Проверить все подписки Dogwater
    console.log('\n=== ВСЕ подписки Dogwater ===')
    const allDogwaterSubs = await prisma.subscription.findMany({
      where: { userId: dogwater.id },
      include: {
        creator: {
          select: {
            nickname: true,
            wallet: true
          }
        }
      }
    })
    
    if (allDogwaterSubs.length === 0) {
      console.log('Подписок не найдено')
    } else {
      for (const sub of allDogwaterSubs) {
        console.log(`\n- На: ${sub.creator.nickname || sub.creator.wallet}`)
        console.log(`  ID подписки: ${sub.id}`)
        console.log(`  План: ${sub.plan}`)
        console.log(`  Цена: ${sub.price} ${sub.currency}`)
        console.log(`  Активна: ${sub.isActive}`)
        console.log(`  Действует до: ${sub.validUntil}`)
        console.log(`  Истекла: ${sub.validUntil < new Date() ? 'ДА' : 'НЕТ'}`)
        console.log(`  Статус платежа: ${sub.paymentStatus}`)
      }
    }
    
    // Проверить конкретно подписку на Pal
    console.log('\n=== Подписка Dogwater на Pal ===')
    const subToPal = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: dogwater.id,
          creatorId: pal.id
        }
      }
    })
    
    if (!subToPal) {
      console.log('❌ Подписка НЕ НАЙДЕНА в базе данных!')
      
      // Проверим транзакции
      console.log('\n=== Проверка транзакций ===')
      const transactions = await prisma.transaction.findMany({
        where: {
          fromWallet: dogwater.wallet,
          toWallet: pal.wallet,
          type: 'SUBSCRIPTION'
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`Найдено транзакций: ${transactions.length}`)
      for (const tx of transactions) {
        console.log(`\n- Signature: ${tx.txSignature}`)
        console.log(`  Сумма: ${tx.amount} ${tx.currency}`)
        console.log(`  Статус: ${tx.status}`)
        console.log(`  Дата: ${tx.createdAt}`)
      }
    } else {
      console.log('✅ Подписка найдена:')
      console.log('- ID:', subToPal.id)
      console.log('- План:', subToPal.plan)
      console.log('- Цена:', subToPal.price, subToPal.currency)
      console.log('- Активна:', subToPal.isActive)
      console.log('- Действует до:', subToPal.validUntil)
      console.log('- Истекла:', subToPal.validUntil < new Date() ? 'ДА' : 'НЕТ')
      console.log('- Статус платежа:', subToPal.paymentStatus)
      console.log('- Дата создания:', subToPal.subscribedAt)
    }
    
    // Проверим активные подписки через API логику
    console.log('\n=== Активные подписки Dogwater (как в API) ===')
    const activeSubs = await prisma.subscription.findMany({
      where: {
        userId: dogwater.id,
        isActive: true,
        validUntil: { gt: new Date() }
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
    
    console.log(`Найдено активных подписок: ${activeSubs.length}`)
    const creatorIds = activeSubs.map(sub => sub.creatorId)
    console.log('Creator IDs:', creatorIds)
    console.log('Подписан на Pal?:', creatorIds.includes(pal.id))
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSubscription() 