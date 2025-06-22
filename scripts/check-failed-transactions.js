const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllDogwaterTransactions() {
  try {
    console.log('🔍 Проверяем ВСЕ транзакции Dogwater (включая неудачные)...\n');
    
    // Найдем Dogwater
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' },
      select: { id: true, nickname: true, wallet: true }
    });
    
    if (!dogwater) {
      console.error('❌ Пользователь Dogwater не найден');
      return;
    }
    
    console.log('👤 Dogwater:', dogwater.wallet);
    
    // Получим ВСЕ транзакции (включая FAILED и PENDING)
    const allTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: dogwater.wallet },
          { senderId: dogwater.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📊 Всего транзакций: ${allTransactions.length}`);
    
    // Группируем по статусу
    const byStatus = {
      CONFIRMED: [],
      FAILED: [],
      PENDING: [],
      EXPIRED: []
    };
    
    allTransactions.forEach(tx => {
      if (byStatus[tx.status]) {
        byStatus[tx.status].push(tx);
      }
    });
    
    console.log('\n📈 По статусам:');
    console.log(`- CONFIRMED: ${byStatus.CONFIRMED.length}`);
    console.log(`- FAILED: ${byStatus.FAILED.length}`);
    console.log(`- PENDING: ${byStatus.PENDING.length}`);
    console.log(`- EXPIRED: ${byStatus.EXPIRED.length}`);
    
    // Показываем неудачные транзакции
    if (byStatus.FAILED.length > 0) {
      console.log('\n❌ НЕУДАЧНЫЕ ТРАНЗАКЦИИ:');
      byStatus.FAILED.forEach((tx, index) => {
        console.log(`\n${index + 1}. Транзакция ${tx.id}:`);
        console.log('   - Сумма:', tx.amount, 'SOL');
        console.log('   - Тип:', tx.type);
        console.log('   - На кошелек:', tx.toWallet);
        console.log('   - Дата:', tx.createdAt);
        console.log('   - Подпись:', tx.txSignature);
        console.log('   - Ошибка:', tx.errorMessage);
      });
    }
    
    // Показываем ожидающие транзакции
    if (byStatus.PENDING.length > 0) {
      console.log('\n⏳ ОЖИДАЮЩИЕ ТРАНЗАКЦИИ:');
      byStatus.PENDING.forEach((tx, index) => {
        console.log(`\n${index + 1}. Транзакция ${tx.id}:`);
        console.log('   - Сумма:', tx.amount, 'SOL');
        console.log('   - Тип:', tx.type);
        console.log('   - На кошелек:', tx.toWallet);
        console.log('   - Дата:', tx.createdAt);
        console.log('   - Подпись:', tx.txSignature);
      });
    }
    
    // Проверяем подписки с неправильными ценами
    console.log('\n🔍 Проверяем подписки Dogwater:');
    
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: dogwater.id },
      include: {
        creator: {
          select: { nickname: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    subscriptions.forEach((sub, index) => {
      // Проверяем соответствие цены тиру
      const expectedPrices = {
        'Free': 0,
        'Basic': 0.05,
        'Premium': 0.15,
        'VIP': 0.35
      };
      
      const expectedPrice = expectedPrices[sub.plan];
      const priceCorrect = sub.price === expectedPrice;
      
      console.log(`\n${index + 1}. Подписка на ${sub.creator.nickname}:`);
      console.log('   - План:', sub.plan);
      console.log('   - Цена:', sub.price, 'SOL', priceCorrect ? '✅' : '⚠️ НЕПРАВИЛЬНАЯ ЦЕНА!');
      if (!priceCorrect) {
        console.log('   - Ожидаемая цена:', expectedPrice, 'SOL');
      }
      console.log('   - Статус оплаты:', sub.paymentStatus);
      console.log('   - Дата:', sub.createdAt);
    });
    
    // Сумма всех транзакций
    const totalSpent = byStatus.CONFIRMED.reduce((sum, tx) => sum + tx.amount, 0);
    console.log(`\n💰 Всего потрачено: ${totalSpent.toFixed(4)} SOL`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllDogwaterTransactions(); 