const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllPremiumSubscriptions() {
  console.log('=== CHECKING ALL PREMIUM SUBSCRIPTIONS ===\n');
  
  // Получаем ВСЕ Premium подписки
  const premiumSubs = await prisma.subscription.findMany({
    where: {
      plan: 'Premium'
    },
    include: {
      user: {
        select: { nickname: true, wallet: true }
      },
      creator: {
        select: { nickname: true, wallet: true }
      },
      transactions: true
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Found ${premiumSubs.length} Premium subscriptions total\n`);
  
  // Группируем по статусу
  const byStatus = {
    COMPLETED: [],
    PENDING: [],
    FAILED: [],
    PROCESSING: []
  };
  
  premiumSubs.forEach(sub => {
    byStatus[sub.paymentStatus] = byStatus[sub.paymentStatus] || [];
    byStatus[sub.paymentStatus].push(sub);
  });
  
  console.log('By status:');
  Object.entries(byStatus).forEach(([status, subs]) => {
    if (subs.length > 0) {
      console.log(`  ${status}: ${subs.length}`);
    }
  });
  
  // Показываем проблемные подписки
  console.log('\n=== PROBLEMATIC PREMIUM SUBSCRIPTIONS ===\n');
  
  const problematic = premiumSubs.filter(sub => 
    sub.paymentStatus !== 'COMPLETED' || 
    !sub.isActive || 
    !sub.txSignature
  );
  
  if (problematic.length === 0) {
    console.log('No problematic Premium subscriptions found!');
  } else {
    console.log(`Found ${problematic.length} problematic subscriptions:\n`);
    
    problematic.forEach(sub => {
      console.log(`User: ${sub.user.nickname || sub.user.wallet?.slice(0, 8)} → Creator: ${sub.creator.nickname}`);
      console.log(`  Status: ${sub.paymentStatus}, Active: ${sub.isActive}`);
      console.log(`  Price: ${sub.price} SOL`);
      console.log(`  Subscribed: ${sub.subscribedAt.toLocaleString()}`);
      console.log(`  TX: ${sub.txSignature?.slice(0, 20) || 'NO SIGNATURE'}...`);
      
      if (sub.transactions && sub.transactions.length > 0) {
        console.log(`  Transactions:`);
        sub.transactions.forEach(tx => {
          console.log(`    - ${tx.txSignature.slice(0, 20)}... Status: ${tx.status}, Amount: ${tx.amount} SOL`);
        });
      }
      console.log('---');
    });
  }
  
  // Проверяем транзакции без подписок
  console.log('\n=== CHECKING PREMIUM SUBSCRIPTION TRANSACTIONS ===\n');
  
  const premiumTx = await prisma.transaction.findMany({
    where: {
      type: 'SUBSCRIPTION',
      amount: { gte: 0.1 }, // Premium обычно стоит больше 0.1 SOL
      metadata: {
        path: ['plan'],
        equals: 'Premium'
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log(`Found ${premiumTx.length} Premium subscription transactions\n`);
  
  for (const tx of premiumTx) {
    const hasLinkedSub = !!tx.subscriptionId;
    console.log(`TX: ${tx.txSignature.slice(0, 30)}...`);
    console.log(`  Amount: ${tx.amount} SOL`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  Created: ${tx.createdAt.toLocaleString()}`);
    console.log(`  Has linked subscription: ${hasLinkedSub ? 'YES' : 'NO'}`);
    
    if (!hasLinkedSub) {
      console.log(`  ⚠️ ORPHANED TRANSACTION!`);
      console.log(`  From: ${tx.fromWallet.slice(0, 8)}...`);
      console.log(`  To: ${tx.toWallet.slice(0, 8)}...`);
    }
    console.log('---');
  }
}

checkAllPremiumSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 