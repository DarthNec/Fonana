const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingSubscriptions() {
  console.log('=== CHECKING ALL PENDING SUBSCRIPTIONS ===\n');
  
  // Получаем все подписки со статусом PENDING
  const pendingSubs = await prisma.subscription.findMany({
    where: {
      paymentStatus: 'PENDING'
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
    orderBy: { subscribedAt: 'desc' },
    take: 20
  });
  
  console.log(`Found ${pendingSubs.length} subscriptions with PENDING status:\n`);
  
  for (const sub of pendingSubs) {
    console.log(`User: ${sub.user.nickname || sub.user.wallet?.slice(0, 8)} → Creator: ${sub.creator.nickname}`);
    console.log(`  Plan: ${sub.plan}, Price: ${sub.price} SOL`);
    console.log(`  Status: ${sub.paymentStatus}, Active: ${sub.isActive}`);
    console.log(`  Subscribed: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  Valid Until: ${sub.validUntil.toLocaleString()}`);
    console.log(`  TX Signature: ${sub.txSignature?.slice(0, 20) || 'NO SIGNATURE'}...`);
    
    // Проверяем связанные транзакции
    if (sub.transactions && sub.transactions.length > 0) {
      console.log(`  Found ${sub.transactions.length} transactions:`);
      sub.transactions.forEach(tx => {
        console.log(`    - ${tx.txSignature.slice(0, 20)}... Status: ${tx.status}`);
      });
    } else {
      console.log(`  ⚠️ NO TRANSACTIONS FOUND`);
    }
    
    // Проверяем возраст подписки
    const ageInHours = (Date.now() - sub.subscribedAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) {
      console.log(`  🚨 STALE: Subscription is ${ageInHours.toFixed(1)} hours old`);
    }
    
    console.log('---');
  }
  
  // Анализ общей картины
  console.log('\n=== ANALYSIS ===\n');
  
  const planCounts = pendingSubs.reduce((acc, sub) => {
    acc[sub.plan] = (acc[sub.plan] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Pending subscriptions by plan:');
  Object.entries(planCounts).forEach(([plan, count]) => {
    console.log(`  ${plan}: ${count}`);
  });
  
  const withTx = pendingSubs.filter(sub => sub.txSignature).length;
  const withoutTx = pendingSubs.filter(sub => !sub.txSignature).length;
  
  console.log(`\nWith TX signature: ${withTx}`);
  console.log(`Without TX signature: ${withoutTx}`);
  
  // Проверяем недавние успешные подписки для сравнения
  console.log('\n=== RECENT SUCCESSFUL SUBSCRIPTIONS ===\n');
  
  const successfulSubs = await prisma.subscription.findMany({
    where: {
      paymentStatus: 'COMPLETED',
      subscribedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    orderBy: { subscribedAt: 'desc' },
    take: 5
  });
  
  console.log(`Found ${successfulSubs.length} successful subscriptions in last 24 hours`);
}

checkPendingSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 