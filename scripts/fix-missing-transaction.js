const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingTransaction() {
  try {
    console.log('🔧 Добавляем пропущенную транзакцию на 0.36 SOL...\n');
    
    // Найдем пользователей
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' }
    });
    
    const vizer36 = await prisma.user.findFirst({ 
      where: { nickname: 'vizer36' }
    });
    
    if (!dogwater || !vizer36) {
      console.error('❌ Пользователи не найдены');
      return;
    }
    
    console.log('✅ Dogwater:', dogwater.wallet);
    console.log('✅ vizer36:', vizer36.wallet);
    
    // Найдем VIP подписку
    const subscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: dogwater.id,
          creatorId: vizer36.id
        }
      }
    });
    
    if (!subscription) {
      console.error('❌ Подписка не найдена');
      return;
    }
    
    console.log('\n📋 Текущая подписка:');
    console.log('- План:', subscription.plan);
    console.log('- Цена в подписке:', subscription.price, 'SOL');
    
    // Создаем транзакцию для истории
    const transaction = await prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        txSignature: `missing_tx_0.36_sol_${Date.now()}`,
        fromWallet: dogwater.wallet,
        toWallet: vizer36.wallet,
        amount: 0.36,  // Реальная сумма транзакции из Solscan
        currency: 'SOL',
        type: 'SUBSCRIPTION',
        status: 'CONFIRMED',
        platformFee: 0.036,  // 10% от 0.36
        creatorAmount: 0.324, // 90% от 0.36
        confirmedAt: new Date(),
        metadata: {
          plan: 'VIP',
          creatorId: vizer36.id,
          originalPrice: 0.40,  // Старая цена, которая показывалась в UI
          actualPrice: 0.36,    // Реальная оплаченная сумма
          expectedPrice: 0.35,  // Новая правильная цена
          note: 'Transaction was missing from database, added manually based on Solscan data',
          issue: 'UI showed old VIP price 0.40 instead of new price 0.35, user paid 0.36'
        }
      }
    });
    
    console.log('\n✅ Транзакция создана:', transaction.id);
    console.log('- Сумма:', transaction.amount, 'SOL');
    console.log('- Комиссия платформы:', transaction.platformFee, 'SOL');
    console.log('- Сумма создателю:', transaction.creatorAmount, 'SOL');
    
    console.log('\n💡 Анализ проблемы:');
    console.log('1. В UI показывалась старая цена VIP: 0.40 SOL');
    console.log('2. Новая правильная цена VIP: 0.35 SOL');
    console.log('3. Пользователь заплатил: 0.36 SOL');
    console.log('4. Возможно, была частичная скидка или ошибка округления');
    console.log('5. Транзакция не была записана в БД из-за несовпадения суммы');
    
    console.log('\n🔧 Что нужно исправить:');
    console.log('1. Убедиться, что SubscribeModal использует актуальные цены');
    console.log('2. Добавить проверку на null значения цен');
    console.log('3. Улучшить обработку ошибок при записи транзакций');
    console.log('4. Добавить логирование всех платежных операций');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingTransaction(); 