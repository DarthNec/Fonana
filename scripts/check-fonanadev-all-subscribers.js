const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllFonanadevSubscribers() {
  console.log('=== ALL FONANADEV SUBSCRIBERS ===\n');
  
  const fonanadev = await prisma.user.findFirst({
    where: { nickname: 'fonanadev' }
  });
  
  if (!fonanadev) {
    console.log('❌ User fonanadev not found!');
    return;
  }
  
  // Все активные подписки
  const activeSubs = await prisma.subscription.findMany({
    where: {
      creatorId: fonanadev.id,
      isActive: true,
      validUntil: { gte: new Date() }
    },
    include: {
      user: { select: { nickname: true, wallet: true } }
    },
    orderBy: { subscribedAt: 'desc' }
  });
  
  console.log(`Total active subscribers: ${activeSubs.length}\n`);
  
  activeSubs.forEach(sub => {
    console.log(`${sub.user.nickname || sub.user.wallet?.slice(0, 8)}`);
    console.log(`  Plan: ${sub.plan} (${sub.price} SOL)`);
    console.log(`  Status: ${sub.paymentStatus}`);
    console.log(`  Subscribed: ${sub.subscribedAt.toLocaleString()}`);
    console.log(`  Valid until: ${sub.validUntil.toLocaleString()}`);
    console.log('---');
  });
  
  // Все неактивные подписки за последние 7 дней
  console.log('\n=== RECENT INACTIVE SUBSCRIPTIONS (7 days) ===');
  const inactiveSubs = await prisma.subscription.findMany({
    where: {
      creatorId: fonanadev.id,
      OR: [
        { isActive: false },
        { validUntil: { lt: new Date() } }
      ],
      subscribedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    include: {
      user: { select: { nickname: true } }
    }
  });
  
  console.log(`Found ${inactiveSubs.length} inactive subscriptions\n`);
  
  inactiveSubs.forEach(sub => {
    console.log(`${sub.user.nickname} - ${sub.plan} - Status: ${sub.paymentStatus} - Active: ${sub.isActive}`);
  });
}

checkAllFonanadevSubscribers()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 