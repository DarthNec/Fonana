const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFreeSubscriptionsStatus() {
  console.log('=== FIXING FREE SUBSCRIPTIONS STATUS ===\n');
  
  // Получаем все Free подписки со статусом PENDING
  const freeSubscriptions = await prisma.subscription.findMany({
    where: {
      plan: 'Free',
      paymentStatus: 'PENDING'
    }
  });
  
  console.log(`Found ${freeSubscriptions.length} free subscriptions to fix\n`);
  
  if (freeSubscriptions.length === 0) {
    console.log('✅ No free subscriptions need fixing!');
    return;
  }
  
  // Обновляем все бесплатные подписки
  const result = await prisma.subscription.updateMany({
    where: {
      plan: 'Free',
      paymentStatus: 'PENDING'
    },
    data: {
      paymentStatus: 'COMPLETED'
    }
  });
  
  console.log(`✅ Updated ${result.count} free subscriptions to COMPLETED status`);
  
  // Проверяем результат
  const remainingPending = await prisma.subscription.count({
    where: {
      plan: 'Free',
      paymentStatus: 'PENDING'
    }
  });
  
  if (remainingPending > 0) {
    console.log(`⚠️ Warning: ${remainingPending} free subscriptions still have PENDING status`);
  } else {
    console.log('✅ All free subscriptions now have proper status!');
  }
}

fixFreeSubscriptionsStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 