const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDogwater04Transaction() {
  try {
    console.log('🔍 Ищем транзакцию Dogwater на 0.4 SOL...\n');
    
    // Найдем Dogwater
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' },
      select: { id: true, nickname: true, wallet: true, solanaWallet: true }
    });
    
    if (!dogwater) {
      console.error('❌ Пользователь Dogwater не найден');
      return;
    }
    
    console.log('👤 Dogwater:');
    console.log('- ID:', dogwater.id);
    console.log('- Wallet:', dogwater.wallet);
    console.log('- Solana Wallet:', dogwater.solanaWallet);
    
    // Найдем ВСЕ транзакции от Dogwater
    const allTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: dogwater.wallet },
          ...(dogwater.solanaWallet ? [{ fromWallet: dogwater.solanaWallet }] : []),
          { senderId: dogwater.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            creator: {
              select: { nickname: true, wallet: true }
            }
          }
        },
        postPurchase: true
      }
    });
    
    console.log(`\n📊 Всего найдено транзакций от Dogwater: ${allTransactions.length}`);
    
    // Ищем транзакцию на 0.4 SOL
    const transaction04 = allTransactions.find(tx => 
      tx.amount === 0.4 || 
      Math.abs(tx.amount - 0.4) < 0.0001 // учитываем погрешность float
    );
    
    if (transaction04) {
      console.log('\n🎯 НАЙДЕНА ТРАНЗАКЦИЯ НА 0.4 SOL:');
      console.log('- ID:', transaction04.id);
      console.log('- Тип:', transaction04.type);
      console.log('- Сумма:', transaction04.amount, 'SOL');
      console.log('- От кошелька:', transaction04.fromWallet);
      console.log('- На кошелек:', transaction04.toWallet);
      console.log('- Статус:', transaction04.status);
      console.log('- Дата:', transaction04.createdAt);
      console.log('- Подпись:', transaction04.txSignature);
      
      if (transaction04.subscription) {
        console.log('\n📋 Связанная подписка:');
        console.log('- ID:', transaction04.subscription.id);
        console.log('- План:', transaction04.subscription.plan);
        console.log('- Создатель:', transaction04.subscription.creator?.nickname);
        console.log('- Кошелек создателя:', transaction04.subscription.creator?.wallet);
      }
      
      if (transaction04.metadata) {
        console.log('\n📝 Метаданные:', JSON.stringify(transaction04.metadata, null, 2));
      }
    } else {
      console.log('\n❌ Транзакция на 0.4 SOL не найдена');
      
      // Покажем все транзакции больше 0.3 SOL
      const largeTransactions = allTransactions.filter(tx => tx.amount >= 0.3);
      console.log(`\n💰 Транзакции >= 0.3 SOL (${largeTransactions.length}):`);
      
      largeTransactions.forEach((tx, index) => {
        console.log(`\n${index + 1}. Транзакция ${tx.id}:`);
        console.log('   - Тип:', tx.type);
        console.log('   - Сумма:', tx.amount, 'SOL');
        console.log('   - На кошелек:', tx.toWallet);
        console.log('   - Статус:', tx.status);
        console.log('   - Дата:', tx.createdAt);
        if (tx.subscription?.creator) {
          console.log('   - Создатель:', tx.subscription.creator.nickname);
        }
      });
    }
    
    // Проверим подписки с ценой 0.4 или null
    console.log('\n🔍 Проверяем подписки с ценой 0.4 SOL или null:');
    
    const problematicSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: dogwater.id,
        OR: [
          { price: 0.4 },
          { price: null },
          { price: 0 }
        ]
      },
      include: {
        creator: {
          select: { nickname: true }
        }
      }
    });
    
    problematicSubscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. Подписка на ${sub.creator.nickname}:`);
      console.log('   - План:', sub.plan);
      console.log('   - Цена:', sub.price, 'SOL');
      console.log('   - Статус оплаты:', sub.paymentStatus);
      console.log('   - Активна:', sub.isActive);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDogwater04Transaction(); 