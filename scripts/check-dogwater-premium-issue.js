const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDogwaterPremiumIssue() {
  try {
    console.log('=== АНАЛИЗ ПРОБЛЕМЫ С PREMIUM ПОДПИСКОЙ НА DOGWATER ===\n');
    
    // 1. Получаем Dogwater
    const dogwater = await prisma.user.findFirst({
      where: { 
        nickname: { equals: 'dogwater', mode: 'insensitive' } 
      }
    });
    
    if (!dogwater) {
      console.log('❌ Dogwater не найден');
      return;
    }
    
    console.log('DOGWATER INFO:');
    console.log(`- ID: ${dogwater.id}`);
    console.log(`- Wallet: ${dogwater.solanaWallet || dogwater.wallet}\n`);
    
    // 2. Проверяем его настройки тиров
    const tierSettings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId: dogwater.id }
    });
    
    if (!tierSettings) {
      console.log('❌ Кастомные тиры НЕ настроены');
      return;
    }
    
    console.log('КАСТОМНЫЕ ЦЕНЫ DOGWATER:');
    const basicTier = tierSettings.basicTier;
    const premiumTier = tierSettings.premiumTier;
    const vipTier = tierSettings.vipTier;
    
    console.log(`- Basic: ${basicTier?.price || 'не установлено'} SOL`);
    console.log(`- Premium: ${premiumTier?.price || 'не установлено'} SOL`);
    console.log(`- VIP: ${vipTier?.price || 'не установлено'} SOL\n`);
    
    // 3. Проверяем последние транзакции подписок на Dogwater
    console.log('ПОСЛЕДНИЕ ТРАНЗАКЦИИ ПОДПИСОК НА DOGWATER:\n');
    
    const recentTxs = await prisma.transaction.findMany({
      where: {
        type: 'SUBSCRIPTION',
        metadata: {
          path: ['creatorId'],
          equals: dogwater.id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    for (const tx of recentTxs) {
      const metadata = tx.metadata;
      const subscription = await prisma.subscription.findFirst({
        where: { txSignature: tx.txSignature },
        include: { user: { select: { nickname: true } } }
      });
      
      console.log(`\nТранзакция: ${tx.txSignature.slice(0, 20)}...`);
      console.log(`Дата: ${tx.createdAt.toISOString()}`);
      console.log(`От: ${subscription?.user.nickname || 'неизвестно'}`);
      console.log(`Статус: ${tx.status}`);
      console.log(`Оплачено: ${tx.amount} SOL`);
      console.log(`План из метаданных: ${metadata?.plan || 'не указан'}`);
      
      if (subscription) {
        console.log(`\nПОДПИСКА В БД:`);
        console.log(`- ID: ${subscription.id}`);
        console.log(`- План: ${subscription.plan}`);
        console.log(`- Цена: ${subscription.price} SOL`);
        console.log(`- Активна: ${subscription.isActive}`);
        console.log(`- Действует до: ${subscription.validUntil.toISOString()}`);
        
        // Проверяем соответствие
        const expectedPrice = {
          'Basic': basicTier?.price || 0.05,
          'Premium': premiumTier?.price || 0.15,
          'VIP': vipTier?.price || 0.35
        };
        
        if (expectedPrice[subscription.plan] !== subscription.price) {
          console.log(`\n⚠️  НЕСООТВЕТСТВИЕ ЦЕНЫ!`);
          console.log(`Ожидалось для ${subscription.plan}: ${expectedPrice[subscription.plan]} SOL`);
          console.log(`Сохранено: ${subscription.price} SOL`);
        }
        
        if (metadata?.plan !== subscription.plan) {
          console.log(`\n⚠️  НЕСООТВЕТСТВИЕ ПЛАНА!`);
          console.log(`В метаданных: ${metadata?.plan}`);
          console.log(`В подписке: ${subscription.plan}`);
        }
      }
      
      console.log('\n' + '-'.repeat(60));
    }
    
    // 4. Проверяем активные подписки на Dogwater
    console.log('\n\nАКТИВНЫЕ ПОДПИСКИ НА DOGWATER:\n');
    
    const activeSubs = await prisma.subscription.findMany({
      where: {
        creatorId: dogwater.id,
        isActive: true,
        validUntil: { gte: new Date() }
      },
      include: {
        user: { select: { nickname: true } }
      },
      orderBy: { subscribedAt: 'desc' },
      take: 20
    });
    
    activeSubs.forEach(sub => {
      console.log(`\n${sub.user.nickname}:`);
      console.log(`- План: ${sub.plan}`);
      console.log(`- Цена: ${sub.price} SOL`);
      console.log(`- Подписан: ${sub.subscribedAt.toISOString().split('T')[0]}`);
      console.log(`- Действует до: ${sub.validUntil.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDogwaterPremiumIssue(); 