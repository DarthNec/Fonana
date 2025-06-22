const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPriceDiscrepancy() {
  try {
    console.log('🔍 Проверяем расхождение цен и ищем транзакцию на 0.36 SOL...\n');
    
    // Проверяем, чей адрес Cm1VWYChpnVgAGvzBvFtfPHqcyMgMqFXy9C9iqFqpHk3
    const walletOwner = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: 'Cm1VWYChpnVgAGvzBvFtfPHqcyMgMqFXy9C9iqFqpHk3' },
          { solanaWallet: 'Cm1VWYChpnVgAGvzBvFtfPHqcyMgMqFXy9C9iqFqpHk3' }
        ]
      }
    });
    
    console.log('💳 Адрес Cm1VWYChpnVgAGvzBvFtfPHqcyMgMqFXy9C9iqFqpHk3 принадлежит:');
    if (walletOwner) {
      console.log('- Пользователь:', walletOwner.nickname);
      console.log('- ID:', walletOwner.id);
      console.log('- isCreator:', walletOwner.isCreator);
    } else {
      console.log('- ❌ Владелец не найден в базе');
    }
    
    // Ищем транзакции на этот адрес от Dogwater
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' }
    });
    
    console.log('\n🔍 Ищем транзакции от Dogwater на этот адрес:');
    
    const transactions = await prisma.transaction.findMany({
      where: {
        fromWallet: dogwater.wallet,
        toWallet: 'Cm1VWYChpnVgAGvzBvFtfPHqcyMgMqFXy9C9iqFqpHk3'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nНайдено транзакций: ${transactions.length}`);
    
    transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Транзакция ${tx.id}:`);
      console.log('   - Сумма:', tx.amount, 'SOL');
      console.log('   - Тип:', tx.type);
      console.log('   - Статус:', tx.status);
      console.log('   - Дата:', tx.createdAt);
      console.log('   - Подпись:', tx.txSignature);
      console.log('   - Комиссия платформы:', tx.platformFee);
      console.log('   - Сумма создателю:', tx.creatorAmount);
      
      if (tx.metadata) {
        console.log('   - Метаданные:', JSON.stringify(tx.metadata, null, 2));
      }
    });
    
    // Проверяем настройки тиров vizer36
    if (walletOwner) {
      console.log('\n⚙️ Проверяем настройки тиров создателя:');
      
      const tierSettings = await prisma.creatorTierSettings.findUnique({
        where: { creatorId: walletOwner.id }
      });
      
      if (tierSettings) {
        console.log('✅ Кастомные настройки найдены:');
        if (tierSettings.basicTier) {
          console.log('- Basic:', JSON.parse(tierSettings.basicTier));
        }
        if (tierSettings.premiumTier) {
          console.log('- Premium:', JSON.parse(tierSettings.premiumTier));
        }
        if (tierSettings.vipTier) {
          console.log('- VIP:', JSON.parse(tierSettings.vipTier));
        }
      } else {
        console.log('❌ Кастомных настроек нет, используются стандартные цены:');
        console.log('- Basic: 0.05 SOL');
        console.log('- Premium: 0.15 SOL');
        console.log('- VIP: 0.35 SOL');
      }
    }
    
    // Проверяем Flash Sales
    console.log('\n🔥 Проверяем активные Flash Sales для vizer36:');
    
    const flashSales = await prisma.flashSale.findMany({
      where: {
        creatorId: walletOwner?.id,
        isActive: true,
        endAt: { gte: new Date() }
      }
    });
    
    if (flashSales.length > 0) {
      flashSales.forEach((sale, index) => {
        console.log(`\n${index + 1}. Flash Sale ${sale.id}:`);
        console.log('   - План:', sale.subscriptionPlan);
        console.log('   - Скидка:', sale.discount, '%');
        console.log('   - Использовано:', sale.usedCount, '/', sale.maxRedemptions || 'unlimited');
        console.log('   - Активна до:', sale.endAt);
        
        // Рассчитываем цену со скидкой
        if (sale.subscriptionPlan === 'vip') {
          const originalPrice = 0.35;
          const discountedPrice = originalPrice * (1 - sale.discount / 100);
          console.log('   - Оригинальная цена VIP:', originalPrice, 'SOL');
          console.log('   - Цена со скидкой:', discountedPrice.toFixed(2), 'SOL');
          
          if (Math.abs(discountedPrice - 0.36) < 0.01) {
            console.log('   - ⚠️ ВОЗМОЖНОЕ СОВПАДЕНИЕ! Цена близка к 0.36 SOL');
          }
        }
      });
    } else {
      console.log('- Активных Flash Sales не найдено');
    }
    
    console.log('\n💡 Возможные причины расхождения цен:');
    console.log('1. Была активна Flash Sale со скидкой');
    console.log('2. В UI показывалась старая цена 0.40 вместо новой 0.35');
    console.log('3. Добавилась комиссия сети (маловероятно для Solana)');
    console.log('4. Ошибка округления при расчете скидки');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPriceDiscrepancy(); 