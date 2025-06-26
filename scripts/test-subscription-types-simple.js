const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSubscriptionTypes() {
  console.log('=== TESTING SUBSCRIPTION TYPES ===\n');
  
  // Получаем все подписки и группируем по типам
  const allSubscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { nickname: true } },
      creator: { select: { nickname: true } }
    }
  });
  
  // Группируем по планам
  const byPlan = {
    'Free': [],
    'Basic': [],
    'Premium': [],
    'VIP': []
  };
  
  const otherPlans = [];
  
  allSubscriptions.forEach(sub => {
    if (byPlan[sub.plan]) {
      byPlan[sub.plan].push(sub);
    } else {
      otherPlans.push(sub);
    }
  });
  
  // Выводим статистику по каждому плану
  Object.entries(byPlan).forEach(([plan, subs]) => {
    console.log(`\n=== ${plan.toUpperCase()} SUBSCRIPTIONS ===`);
    console.log(`Total: ${subs.length}`);
    
    // Считаем по статусам
    const statusCounts = {};
    subs.forEach(sub => {
      const status = sub.paymentStatus || 'NULL';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\nBy payment status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Считаем активные
    const now = new Date();
    const activeCount = subs.filter(sub => 
      sub.isActive && sub.validUntil > now
    ).length;
    
    const activeCompletedCount = subs.filter(sub => 
      sub.isActive && sub.validUntil > now && sub.paymentStatus === 'COMPLETED'
    ).length;
    
    const activeNotCompletedCount = activeCount - activeCompletedCount;
    
    console.log(`\nActive subscriptions:`);
    console.log(`  Total active: ${activeCount}`);
    console.log(`  With COMPLETED status: ${activeCompletedCount}`);
    console.log(`  Without COMPLETED status: ${activeNotCompletedCount} ${activeNotCompletedCount > 0 ? '⚠️' : '✅'}`);
    
    // Показываем примеры проблемных
    if (activeNotCompletedCount > 0) {
      console.log('\nExamples of problematic subscriptions:');
      const problematic = subs.filter(sub => 
        sub.isActive && sub.validUntil > now && sub.paymentStatus !== 'COMPLETED'
      ).slice(0, 3);
      
      problematic.forEach(sub => {
        console.log(`  - ${sub.user.nickname || 'N/A'} → ${sub.creator.nickname || 'N/A'} (status: ${sub.paymentStatus || 'NULL'})`);
      });
    }
  });
  
  // Если есть другие планы
  if (otherPlans.length > 0) {
    console.log(`\n=== OTHER PLANS ===`);
    const uniquePlans = [...new Set(otherPlans.map(s => s.plan))];
    uniquePlans.forEach(plan => {
      const count = otherPlans.filter(s => s.plan === plan).length;
      console.log(`  "${plan}": ${count} subscriptions`);
    });
  }
  
  // Общая статистика
  console.log(`\n=== OVERALL STATISTICS ===`);
  console.log(`Total subscriptions: ${allSubscriptions.length}`);
  
  const totalWithStatus = allSubscriptions.filter(s => s.paymentStatus).length;
  const totalWithoutStatus = allSubscriptions.filter(s => !s.paymentStatus).length;
  
  console.log(`With paymentStatus: ${totalWithStatus}`);
  console.log(`Without paymentStatus: ${totalWithoutStatus}`);
  
  if (totalWithoutStatus > 0) {
    console.log('\n⚠️ Found subscriptions without paymentStatus!');
    console.log('Run scripts/fix-subscriptions-without-status.js to fix them.');
  }
}

testSubscriptionTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 