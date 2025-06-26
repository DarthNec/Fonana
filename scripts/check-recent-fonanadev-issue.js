const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentFonanadevIssue() {
  console.log('=== CHECKING RECENT FONANADEV SUBSCRIPTION ISSUE ===\n');
  
  // Получаем fonanadev пользователя
  const fonanadev = await prisma.user.findFirst({
    where: { nickname: 'fonanadev' }
  });
  
  if (!fonanadev) {
    console.log('❌ User fonanadev not found!');
    return;
  }
  
  console.log(`Found fonanadev: ${fonanadev.id}\n`);
  
  // Проверяем последние подписки на fonanadev
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  console.log('=== RECENT SUBSCRIPTIONS (last hour) ===');
  const recentSubs = await prisma.subscription.findMany({
    where: {
      creatorId: fonanadev.id,
      subscribedAt: { gte: oneHourAgo }
    },
    include: {
      user: { select: { nickname: true, wallet: true } },
      transactions: true
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Found ${recentSubs.length} recent subscriptions:\n`);
  
  recentSubs.forEach(sub => {
    console.log(`User: ${sub.user.nickname || sub.user.wallet?.slice(0, 8)}`);
    console.log(`  Plan: ${sub.plan}, Price: ${sub.price} SOL`);
    console.log(`  Status: ${sub.paymentStatus}, Active: ${sub.isActive}`);
    console.log(`  Subscribed: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  TX Signature: ${sub.txSignature ? sub.txSignature.slice(0, 20) + '...' : 'NO SIGNATURE'}`);
    console.log(`  Transactions: ${sub.transactions.length}`);
    if (sub.transactions.length > 0) {
      sub.transactions.forEach(tx => {
        console.log(`    - TX: ${tx.txSignature.slice(0, 20)}... Status: ${tx.status}`);
      });
    }
    console.log('---');
  });
  
  // Проверяем последние транзакции для fonanadev
  console.log('\n=== RECENT TRANSACTIONS (last hour) ===');
  const recentTxs = await prisma.transaction.findMany({
    where: {
      toWallet: fonanadev.solanaWallet || fonanadev.wallet || '',
      createdAt: { gte: oneHourAgo },
      type: 'SUBSCRIPTION'
    },
    include: {
      subscription: {
        include: {
          user: { select: { nickname: true, wallet: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${recentTxs.length} recent transactions:\n`);
  
  recentTxs.forEach(tx => {
    console.log(`TX: ${tx.txSignature.slice(0, 20)}...`);
    console.log(`  From: ${tx.fromWallet.slice(0, 8)}...`);
    console.log(`  Amount: ${tx.amount} SOL`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  Created: ${tx.createdAt.toLocaleString()}`);
    console.log(`  Confirmed: ${tx.confirmedAt ? tx.confirmedAt.toLocaleString() : 'NOT CONFIRMED'}`);
    if (tx.subscription) {
      console.log(`  Linked to subscription: ${tx.subscription.id}`);
      console.log(`  User: ${tx.subscription.user.nickname || 'N/A'}`);
    } else {
      console.log(`  ⚠️ NO LINKED SUBSCRIPTION!`);
    }
    console.log('---');
  });
  
  // Проверяем проблемные подписки (PENDING или без транзакций)
  console.log('\n=== PROBLEMATIC SUBSCRIPTIONS ===');
  const problematicSubs = await prisma.subscription.findMany({
    where: {
      creatorId: fonanadev.id,
      OR: [
        { paymentStatus: 'PENDING' },
        { paymentStatus: 'PROCESSING' }
      ],
      subscribedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // последние 24 часа
    },
    include: {
      user: { select: { nickname: true, wallet: true } },
      transactions: true
    }
  });
  
  console.log(`Found ${problematicSubs.length} problematic subscriptions:\n`);
  
  problematicSubs.forEach(sub => {
    console.log(`User: ${sub.user.nickname || sub.user.wallet?.slice(0, 8)}`);
    console.log(`  Status: ${sub.paymentStatus}`);
    console.log(`  Created: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  Transactions: ${sub.transactions.length}`);
    console.log('---');
  });
}

checkRecentFonanadevIssue()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 