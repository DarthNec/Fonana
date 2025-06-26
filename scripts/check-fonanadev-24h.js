const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFonanadev24h() {
  console.log('=== CHECKING ALL FONANADEV ACTIVITY (24 HOURS) ===\n');
  
  const fonanadev = await prisma.user.findFirst({
    where: { nickname: 'fonanadev' },
    select: { id: true, wallet: true, solanaWallet: true }
  });
  
  if (!fonanadev) {
    console.log('❌ User fonanadev not found!');
    return;
  }
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Все подписки за 24 часа
  console.log('=== ALL SUBSCRIPTIONS (24h) ===');
  const allSubs = await prisma.subscription.findMany({
    where: {
      creatorId: fonanadev.id,
      subscribedAt: { gte: oneDayAgo }
    },
    include: {
      user: { select: { nickname: true, wallet: true } }
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Total: ${allSubs.length} subscriptions\n`);
  
  // Группируем по статусу
  const byStatus = {};
  allSubs.forEach(sub => {
    const status = sub.paymentStatus || 'NULL';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(sub);
  });
  
  Object.entries(byStatus).forEach(([status, subs]) => {
    console.log(`\n${status}: ${subs.length} subscriptions`);
    subs.forEach(sub => {
      console.log(`  - ${sub.user.nickname || sub.user.wallet?.slice(0, 8)} | ${sub.plan} | ${sub.price} SOL | ${sub.subscribedAt.toLocaleString()}`);
    });
  });
  
  // Все транзакции к fonanadev
  console.log('\n\n=== ALL TRANSACTIONS TO FONANADEV (24h) ===');
  const allTxs = await prisma.transaction.findMany({
    where: {
      OR: [
        { toWallet: fonanadev.wallet || '' },
        { toWallet: fonanadev.solanaWallet || '' }
      ],
      createdAt: { gte: oneDayAgo }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total: ${allTxs.length} transactions\n`);
  
  allTxs.forEach(tx => {
    console.log(`TX: ${tx.txSignature.slice(0, 40)}...`);
    console.log(`  Type: ${tx.type} | Amount: ${tx.amount} SOL | Status: ${tx.status}`);
    console.log(`  From: ${tx.fromWallet.slice(0, 8)}... | Created: ${tx.createdAt.toLocaleString()}`);
    if (tx.errorMessage) {
      console.log(`  ERROR: ${tx.errorMessage}`);
    }
    console.log('---');
  });
}

checkFonanadev24h()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 