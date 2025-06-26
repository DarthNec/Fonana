const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentPremiumSubscriptions() {
  console.log('=== CHECKING RECENT PREMIUM SUBSCRIPTIONS ===\n');
  
  // Получаем Premium подписки за последние 2 дня
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const recentPremiumSubs = await prisma.subscription.findMany({
    where: {
      plan: 'Premium',
      subscribedAt: { gte: twoDaysAgo }
    },
    include: {
      user: {
        select: { nickname: true, wallet: true }
      },
      creator: {
        select: { nickname: true, wallet: true }
      }
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Found ${recentPremiumSubs.length} Premium subscriptions in last 2 days:\n`);
  
  for (const sub of recentPremiumSubs) {
    console.log(`User: ${sub.user.nickname || sub.user.wallet?.slice(0, 8)} → Creator: ${sub.creator.nickname}`);
    console.log(`  Status: ${sub.paymentStatus}, Active: ${sub.isActive}`);
    console.log(`  Price: ${sub.price} SOL`);
    console.log(`  Subscribed: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  Valid Until: ${sub.validUntil.toLocaleString()}`);
    console.log(`  TX: ${sub.txSignature?.slice(0, 20)}...`);
    
    // Проверяем транзакцию
    if (sub.txSignature) {
      const transaction = await prisma.transaction.findUnique({
        where: { txSignature: sub.txSignature }
      });
      
      if (transaction) {
        console.log(`  Transaction Status: ${transaction.status}`);
        console.log(`  Transaction Confirmed: ${transaction.confirmedAt ? 'Yes' : 'No'}`);
      } else {
        console.log(`  ⚠️ No transaction record found!`);
      }
    }
    console.log('---');
  }
  
  // Проверяем транзакции без подписок
  console.log('\n=== CHECKING ORPHANED TRANSACTIONS ===\n');
  
  const recentTx = await prisma.transaction.findMany({
    where: {
      type: 'SUBSCRIPTION',
      createdAt: { gte: twoDaysAgo },
      subscriptionId: null
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`Found ${recentTx.length} subscription transactions without linked subscriptions:\n`);
  
  for (const tx of recentTx) {
    console.log(`TX: ${tx.txSignature.slice(0, 20)}...`);
    console.log(`  Amount: ${tx.amount} SOL`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  From: ${tx.fromWallet.slice(0, 8)}...`);
    console.log(`  To: ${tx.toWallet.slice(0, 8)}...`);
    console.log(`  Created: ${tx.createdAt.toLocaleString()}`);
    console.log(`  Metadata:`, JSON.stringify(tx.metadata, null, 2));
    console.log('---');
  }
}

checkRecentPremiumSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 