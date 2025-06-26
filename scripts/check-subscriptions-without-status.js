const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscriptionsWithoutStatus() {
  console.log('=== CHECKING SUBSCRIPTIONS WITHOUT PAYMENT STATUS ===\n');
  
  // Проверяем подписки где paymentStatus = null
  const subsWithoutStatus = await prisma.subscription.findMany({
    where: {
      paymentStatus: null
    },
    include: {
      user: { select: { nickname: true } },
      creator: { select: { nickname: true } }
    }
  });
  
  console.log(`Found ${subsWithoutStatus.length} subscriptions without paymentStatus\n`);
  
  if (subsWithoutStatus.length > 0) {
    console.log('First 10 examples:');
    subsWithoutStatus.slice(0, 10).forEach(sub => {
      console.log(`- ${sub.user.nickname} → ${sub.creator.nickname} (${sub.plan}, ${sub.price} SOL)`);
    });
    
    // Группируем по планам
    const byPlan = {};
    subsWithoutStatus.forEach(sub => {
      byPlan[sub.plan] = (byPlan[sub.plan] || 0) + 1;
    });
    
    console.log('\nBy plan:');
    Object.entries(byPlan).forEach(([plan, count]) => {
      console.log(`  ${plan}: ${count}`);
    });
  }
  
  // Проверяем активные подписки без статуса
  const activeWithoutStatus = await prisma.subscription.count({
    where: {
      isActive: true,
      validUntil: { gte: new Date() },
      paymentStatus: null
    }
  });
  
  console.log(`\n⚠️ Active subscriptions without paymentStatus: ${activeWithoutStatus}`);
  
  if (activeWithoutStatus > 0) {
    console.log('\nThese subscriptions will NOT work after our fix!');
    console.log('Need to run migration to set default status.');
  }
}

checkSubscriptionsWithoutStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 