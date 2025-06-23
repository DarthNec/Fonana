const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSubscriptionFix() {
  try {
    console.log('=== ТЕСТ ИСПРАВЛЕНИЯ ПОДПИСОК ===\n');
    
    // 1. Проверяем текущие настройки тиров для нескольких создателей
    console.log('1. ПРОВЕРКА НАСТРОЕК ТИРОВ:\n');
    
    const creators = await prisma.user.findMany({
      where: { 
        isCreator: true,
        nickname: {
          in: ['lafufu', 'yanelucia', 'vizer36']
        }
      }
    });
    
    for (const creator of creators) {
      console.log(`\n${creator.nickname.toUpperCase()}:`);
      
      const tierSettings = await prisma.creatorTierSettings.findUnique({
        where: { creatorId: creator.id }
      });
      
      if (tierSettings) {
        console.log('✅ Кастомные настройки тиров найдены');
        if (tierSettings.basicTier) {
          const basic = tierSettings.basicTier;
          console.log(`  Basic: ${basic.price || 0.05} SOL`);
        }
        if (tierSettings.premiumTier) {
          const premium = tierSettings.premiumTier;
          console.log(`  Premium: ${premium.price || 0.15} SOL`);
        }
        if (tierSettings.vipTier) {
          const vip = tierSettings.vipTier;
          console.log(`  VIP: ${vip.price || 0.35} SOL`);
        }
      } else {
        console.log('❌ Нет кастомных тиров - используются дефолтные (0.05, 0.15, 0.35)');
      }
    }
    
    // 2. Проверяем последние подписки
    console.log('\n\n2. ПОСЛЕДНИЕ 10 ПОДПИСОК:\n');
    
    const recentSubs = await prisma.subscription.findMany({
      where: {
        isActive: true
      },
      include: {
        user: {
          select: { nickname: true }
        },
        creator: {
          select: { nickname: true }
        }
      },
      orderBy: { subscribedAt: 'desc' },
      take: 10
    });
    
    recentSubs.forEach(sub => {
      console.log(`${sub.user.nickname} → ${sub.creator.nickname}:`);
      console.log(`  План: ${sub.plan}, Цена: ${sub.price} SOL`);
      console.log(`  Дата: ${sub.subscribedAt.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // 3. Проверяем несоответствия план/цена
    console.log('\n3. ПРОВЕРКА НЕСООТВЕТСТВИЙ ПЛАН/ЦЕНА:\n');
    
    const standardPrices = {
      'Basic': 0.05,
      'Premium': 0.15,
      'VIP': 0.35
    };
    
    const mismatches = await prisma.subscription.findMany({
      where: {
        isActive: true,
        OR: [
          { plan: 'Basic', NOT: { price: 0.05 } },
          { plan: 'Premium', NOT: { price: 0.15 } },
          { plan: 'VIP', NOT: { price: 0.35 } }
        ]
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      }
    });
    
    if (mismatches.length === 0) {
      console.log('✅ Несоответствий не найдено - все подписки имеют правильные цены');
    } else {
      console.log(`❌ Найдено ${mismatches.length} несоответствий:`);
      mismatches.forEach(sub => {
        const expectedPrice = standardPrices[sub.plan];
        console.log(`\n- ${sub.user.nickname} → ${sub.creator.nickname}`);
        console.log(`  План: ${sub.plan}, Оплачено: ${sub.price} SOL`);
        console.log(`  Ожидалось: ${expectedPrice} SOL`);
        console.log(`  Разница: ${Math.abs(sub.price - expectedPrice).toFixed(3)} SOL`);
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionFix(); 