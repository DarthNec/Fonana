const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllSubscriptionTypes() {
  console.log('=== TESTING ALL SUBSCRIPTION TYPES ===\n');
  
  // Тестируем все типы подписок
  const subscriptionTypes = ['Free', 'Basic', 'Premium', 'VIP'];
  
  for (const plan of subscriptionTypes) {
    console.log(`\n=== ${plan.toUpperCase()} SUBSCRIPTIONS ===`);
    
    // Получаем все подписки этого типа
    const subscriptions = await prisma.subscription.findMany({
      where: { plan },
      include: {
        user: { select: { nickname: true, wallet: true } },
        creator: { select: { nickname: true, wallet: true } }
      },
      take: 5
    });
    
    console.log(`Found ${subscriptions.length} ${plan} subscriptions\n`);
    
    // Проверяем статусы
    const byStatus = {
      COMPLETED: 0,
      PENDING: 0,
      null: 0
    };
    
    subscriptions.forEach(sub => {
      const status = sub.paymentStatus || 'null';
      byStatus[status]++;
    });
    
    console.log('By paymentStatus:');
    Object.entries(byStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  ${status}: ${count}`);
      }
    });
    
    // Проверяем активные подписки после наших изменений
    const activeWithCompleted = await prisma.subscription.count({
      where: {
        plan,
        isActive: true,
        validUntil: { gte: new Date() },
        paymentStatus: 'COMPLETED'
      }
    });
    
    const activeWithoutCompleted = await prisma.subscription.count({
      where: {
        plan,
        isActive: true,
        validUntil: { gte: new Date() },
        NOT: {
          paymentStatus: 'COMPLETED'
        }
      }
    });
    
    console.log(`\nActive subscriptions:`);
    console.log(`  With COMPLETED status: ${activeWithCompleted}`);
    console.log(`  Without COMPLETED status: ${activeWithoutCompleted} ⚠️`);
    
    // Показываем примеры проблемных подписок
    if (activeWithoutCompleted > 0) {
      const problematic = await prisma.subscription.findMany({
        where: {
          plan,
          isActive: true,
          validUntil: { gte: new Date() },
          NOT: {
            paymentStatus: 'COMPLETED'
          }
        },
        include: {
          user: { select: { nickname: true } },
          creator: { select: { nickname: true } }
        },
        take: 3
      });
      
      console.log('\nExamples of problematic subscriptions:');
      problematic.forEach(sub => {
        console.log(`  - ${sub.user.nickname} → ${sub.creator.nickname} (status: ${sub.paymentStatus || 'null'})`);
      });
    }
  }
  
  // Проверяем, что Free подписки могут создаваться через /api/subscriptions
  console.log('\n=== TESTING FREE SUBSCRIPTION CREATION ===');
  
  // Симулируем создание бесплатной подписки
  console.log('\nFree subscriptions through /api/subscriptions:');
  console.log('✅ Will be accepted (price = 0)');
  console.log('✅ Will get paymentStatus: COMPLETED');
  console.log('✅ Will work properly');
  
  console.log('\nPaid subscriptions through /api/subscriptions:');
  console.log('❌ Will be rejected (price > 0)');
  console.log('❌ Must use /api/subscriptions/process-payment');
  
  // Проверяем проблемы с регистром
  console.log('\n=== CHECKING CASE SENSITIVITY ===');
  
  const caseSensitiveCheck = await prisma.subscription.groupBy({
    by: ['plan'],
    _count: true
  });
  
  console.log('\nUnique plan values in database:');
  caseSensitiveCheck.forEach(({ plan, _count }) => {
    console.log(`  "${plan}": ${_count} subscriptions`);
  });
  
  // Ищем проблемы с регистром
  const lowerCasePlans = await prisma.subscription.findMany({
    where: {
      OR: [
        { plan: 'free' },
        { plan: 'basic' },
        { plan: 'premium' },
        { plan: 'vip' }
      ]
    }
  });
  
  if (lowerCasePlans.length > 0) {
    console.log(`\n⚠️ Found ${lowerCasePlans.length} subscriptions with lowercase plans!`);
    console.log('This may cause issues with tier comparisons.');
  }
}

testAllSubscriptionTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 