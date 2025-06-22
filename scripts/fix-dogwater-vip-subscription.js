const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDogwaterVipSubscription() {
  try {
    console.log('🔧 Исправляем VIP подписку Dogwater на vizer36...\n');
    
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
    
    console.log('✅ Найден Dogwater:', dogwater.id);
    console.log('✅ Найден vizer36:', vizer36.id);
    
    // Найдем текущую подписку
    const currentSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: dogwater.id,
          creatorId: vizer36.id
        }
      }
    });
    
    if (!currentSubscription) {
      console.error('❌ Подписка не найдена');
      return;
    }
    
    console.log('\n📋 Текущая подписка:');
    console.log('- ID:', currentSubscription.id);
    console.log('- План:', currentSubscription.plan);
    console.log('- Цена:', currentSubscription.price, 'SOL');
    console.log('- Статус:', currentSubscription.isActive ? 'Активна' : 'Неактивна');
    console.log('- Статус оплаты:', currentSubscription.paymentStatus);
    
    // Обновляем подписку на VIP
    const updatedSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        plan: 'VIP',
        price: 0.35,
        isActive: true,
        paymentStatus: 'COMPLETED',
        paymentAmount: 0.35,
        platformFee: 0.035,    // 10% платформе
        creatorAmount: 0.315,  // 90% создателю
        subscribedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
      }
    });
    
    console.log('\n✅ Подписка обновлена на VIP:');
    console.log('- План:', updatedSubscription.plan);
    console.log('- Цена:', updatedSubscription.price, 'SOL');
    console.log('- Действительна до:', updatedSubscription.validUntil);
    console.log('- Статус оплаты:', updatedSubscription.paymentStatus);
    
    // Создаем транзакцию для истории (симулируем успешную оплату)
    const transaction = await prisma.transaction.create({
      data: {
        subscriptionId: updatedSubscription.id,
        txSignature: `manual_fix_${Date.now()}_vip_subscription`,
        fromWallet: dogwater.wallet || dogwater.solanaWallet || 'unknown',
        toWallet: vizer36.wallet || vizer36.solanaWallet || 'unknown',
        amount: 0.35,
        currency: 'SOL',
        type: 'SUBSCRIPTION',
        status: 'CONFIRMED',
        platformFee: 0.035,
        creatorAmount: 0.315,
        confirmedAt: new Date(),
        metadata: {
          plan: 'VIP',
          creatorId: vizer36.id,
          manualFix: true,
          reason: 'Fix missing VIP subscription payment'
        }
      }
    });
    
    console.log('\n✅ Транзакция создана:', transaction.id);
    
    // Проверяем доступ к постам
    const vizerPosts = await prisma.post.findMany({
      where: {
        creatorId: vizer36.id,
        minSubscriptionTier: { not: null }
      },
      select: {
        title: true,
        minSubscriptionTier: true
      }
    });
    
    console.log('\n📝 Теперь Dogwater имеет доступ к постам:');
    vizerPosts.forEach(post => {
      const hasAccess = checkAccess('vip', post.minSubscriptionTier);
      console.log(`- "${post.title}" (${post.minSubscriptionTier}):`, hasAccess ? '✅ Да' : '❌ Нет');
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function checkAccess(userTier, requiredTier) {
  const TIER_HIERARCHY = {
    'vip': 4,
    'premium': 3,
    'basic': 2,
    'free': 1
  };
  
  const userLevel = TIER_HIERARCHY[userTier.toLowerCase()] || 0;
  const requiredLevel = TIER_HIERARCHY[requiredTier.toLowerCase()] || 0;
  
  return userLevel >= requiredLevel;
}

fixDogwaterVipSubscription(); 