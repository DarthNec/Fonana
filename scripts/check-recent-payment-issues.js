const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentPaymentIssues() {
  console.log('=== CHECKING RECENT PAYMENT ISSUES ===\n');
  
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  
  // Проверяем все транзакции с ошибками
  console.log('=== FAILED TRANSACTIONS (last 3 hours) ===');
  const failedTxs = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: threeHoursAgo },
      status: { in: ['FAILED', 'PENDING'] }
    },
    include: {
      subscription: {
        include: {
          user: { select: { nickname: true, wallet: true } },
          creator: { select: { nickname: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${failedTxs.length} failed/pending transactions:\n`);
  
  failedTxs.forEach(tx => {
    console.log(`TX: ${tx.txSignature.slice(0, 30)}...`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  Amount: ${tx.amount} SOL`);
    console.log(`  Type: ${tx.type}`);
    console.log(`  Created: ${tx.createdAt.toLocaleString()}`);
    if (tx.errorMessage) {
      console.log(`  Error: ${tx.errorMessage}`);
    }
    if (tx.subscription) {
      console.log(`  User: ${tx.subscription.user.nickname || 'N/A'} → ${tx.subscription.creator.nickname}`);
    }
    console.log('---');
  });
  
  // Проверяем подписки с проблемными статусами
  console.log('\n=== PENDING/PROCESSING SUBSCRIPTIONS (last 3 hours) ===');
  const problematicSubs = await prisma.subscription.findMany({
    where: {
      subscribedAt: { gte: threeHoursAgo },
      paymentStatus: { in: ['PENDING', 'PROCESSING'] }
    },
    include: {
      user: { select: { nickname: true, wallet: true } },
      creator: { select: { nickname: true } },
      transactions: true
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Found ${problematicSubs.length} problematic subscriptions:\n`);
  
  problematicSubs.forEach(sub => {
    console.log(`${sub.user.nickname || sub.user.wallet?.slice(0, 8)} → ${sub.creator.nickname}`);
    console.log(`  Plan: ${sub.plan}, Price: ${sub.price} SOL`);
    console.log(`  Status: ${sub.paymentStatus}`);
    console.log(`  Created: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  TX Count: ${sub.transactions.length}`);
    console.log(`  TX Signature: ${sub.txSignature ? sub.txSignature.slice(0, 30) + '...' : 'NO SIGNATURE'}`);
    console.log('---');
  });
  
  // Проверяем недавние успешные подписки для сравнения
  console.log('\n=== SUCCESSFUL SUBSCRIPTIONS (last hour) ===');
  const successfulSubs = await prisma.subscription.findMany({
    where: {
      subscribedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      paymentStatus: 'COMPLETED',
      price: { gt: 0 } // только платные
    },
    include: {
      user: { select: { nickname: true } },
      creator: { select: { nickname: true } }
    },
    orderBy: { subscribedAt: 'desc' },
    take: 5
  });
  
  console.log(`Found ${successfulSubs.length} successful paid subscriptions:\n`);
  
  successfulSubs.forEach(sub => {
    console.log(`✅ ${sub.user.nickname} → ${sub.creator.nickname}`);
    console.log(`   Plan: ${sub.plan}, Price: ${sub.price} SOL`);
    console.log(`   Created: ${sub.subscribedAt.toLocaleString()}`);
  });
}

checkRecentPaymentIssues()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 