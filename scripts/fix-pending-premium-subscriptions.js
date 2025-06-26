const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPendingPremiumSubscriptions() {
  console.log('=== FIXING PENDING PREMIUM SUBSCRIPTIONS ===\n');
  
  // Получаем все Premium подписки со статусом PENDING
  const pendingPremiumSubs = await prisma.subscription.findMany({
    where: {
      plan: 'Premium',
      paymentStatus: 'PENDING'
    },
    include: {
      user: {
        select: { nickname: true, wallet: true }
      },
      creator: {
        select: { nickname: true, wallet: true }
      }
    }
  });
  
  console.log(`Found ${pendingPremiumSubs.length} pending Premium subscriptions to fix\n`);
  
  // Вариант 1: Деактивировать неоплаченные подписки
  console.log('Option 1: DEACTIVATE unpaid subscriptions');
  console.log('This will disable access until proper payment is made\n');
  
  // Вариант 2: Конвертировать в бесплатные
  console.log('Option 2: CONVERT to Free plan');
  console.log('This will downgrade them to free tier\n');
  
  // Показываем список для принятия решения
  for (const sub of pendingPremiumSubs) {
    console.log(`${sub.user.nickname} → ${sub.creator.nickname}`);
    console.log(`  Created: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  Price: ${sub.price} SOL`);
    console.log(`  No payment signature`);
    console.log('---');
  }
  
  console.log('\n=== RECOMMENDED ACTIONS ===\n');
  console.log('1. Run this script with --deactivate flag to disable unpaid subscriptions');
  console.log('2. Notify affected users about the issue');
  console.log('3. Offer them to resubscribe properly through the payment flow');
  console.log('4. Deploy the fixes to prevent this in the future');
  
  // Если передан флаг --deactivate, выполняем деактивацию
  if (process.argv.includes('--deactivate')) {
    console.log('\n=== DEACTIVATING UNPAID SUBSCRIPTIONS ===\n');
    
    for (const sub of pendingPremiumSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          isActive: false,
          paymentStatus: 'FAILED'
        }
      });
      
      console.log(`✓ Deactivated: ${sub.user.nickname} → ${sub.creator.nickname}`);
    }
    
    console.log(`\n✅ Deactivated ${pendingPremiumSubs.length} unpaid subscriptions`);
  }
  
  // Если передан флаг --convert-to-free, конвертируем в бесплатные
  if (process.argv.includes('--convert-to-free')) {
    console.log('\n=== CONVERTING TO FREE SUBSCRIPTIONS ===\n');
    
    for (const sub of pendingPremiumSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan: 'Free',
          price: 0,
          paymentStatus: 'COMPLETED'
        }
      });
      
      console.log(`✓ Converted to Free: ${sub.user.nickname} → ${sub.creator.nickname}`);
    }
    
    console.log(`\n✅ Converted ${pendingPremiumSubs.length} subscriptions to Free plan`);
  }
}

fixPendingPremiumSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 