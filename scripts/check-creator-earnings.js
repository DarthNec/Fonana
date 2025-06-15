const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCreatorEarnings() {
  try {
    console.log('=== Проверка заработков авторов ===\n')
    
    // Получаем всех авторов
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true
      },
      select: {
        id: true,
        nickname: true,
        wallet: true
      }
    })
    
    console.log(`Найдено ${creators.length} авторов\n`)
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    for (const creator of creators) {
      console.log(`\n=== ${creator.nickname || creator.wallet?.slice(0, 8)} ===`)
      console.log(`Wallet: ${creator.wallet || 'НЕТ'}`)
      
      if (!creator.wallet) {
        console.log('Заработки: 0 SOL (нет кошелька)')
        continue
      }
      
      // Получаем все транзакции за последние 30 дней
      const transactions = await prisma.transaction.findMany({
        where: {
          toWallet: creator.wallet,
          status: 'CONFIRMED',
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      console.log(`Транзакций за 30 дней: ${transactions.length}`)
      
      // Группируем по типам
      const byType = {
        SUBSCRIPTION: { count: 0, amount: 0 },
        POST_PURCHASE: { count: 0, amount: 0 },
        REFERRER_FEE: { count: 0, amount: 0 },
        OTHER: { count: 0, amount: 0 }
      }
      
      let totalAmount = 0
      
      for (const tx of transactions) {
        totalAmount += tx.amount
        
        if (byType[tx.type]) {
          byType[tx.type].count++
          byType[tx.type].amount += tx.amount
        } else {
          byType.OTHER.count++
          byType.OTHER.amount += tx.amount
        }
      }
      
      console.log(`\nЗаработки за 30 дней: ${totalAmount.toFixed(4)} SOL`)
      
      if (byType.SUBSCRIPTION.count > 0) {
        console.log(`- Подписки: ${byType.SUBSCRIPTION.count} шт, ${byType.SUBSCRIPTION.amount.toFixed(4)} SOL`)
      }
      if (byType.POST_PURCHASE.count > 0) {
        console.log(`- Покупки постов: ${byType.POST_PURCHASE.count} шт, ${byType.POST_PURCHASE.amount.toFixed(4)} SOL`)
      }
      if (byType.REFERRER_FEE.count > 0) {
        console.log(`- Реферальные: ${byType.REFERRER_FEE.count} шт, ${byType.REFERRER_FEE.amount.toFixed(4)} SOL`)
      }
      
      // Показываем последние транзакции
      if (transactions.length > 0) {
        console.log('\nПоследние транзакции:')
        transactions.slice(0, 3).forEach(tx => {
          console.log(`- ${tx.type}: ${tx.amount} SOL (${tx.createdAt.toISOString()})`)
        })
      }
    }
    
    // Общая статистика
    console.log('\n\n=== ОБЩАЯ СТАТИСТИКА ===')
    const allTransactions = await prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    
    const totalVolume = allTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    console.log(`Общий оборот за 30 дней: ${totalVolume.toFixed(4)} SOL`)
    console.log(`Всего транзакций: ${allTransactions.length}`)
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCreatorEarnings() 