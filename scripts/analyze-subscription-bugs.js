const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSubscriptionBugs() {
  try {
    console.log('=== SUBSCRIPTION BUGS ANALYSIS ===\n');

    // 1. Проверяем все активные подписки
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        validUntil: { gte: new Date() }
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

    console.log(`Total active subscriptions: ${activeSubscriptions.length}`);
    
    // Группируем по планам
    const planCounts = activeSubscriptions.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nSubscriptions by plan:');
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`  ${plan}: ${count}`);
    });

    // 2. Проверяем подписки с проблемами оплаты
    const problematicSubs = await prisma.subscription.findMany({
      where: {
        isActive: true,
        paymentStatus: { not: 'COMPLETED' }
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      }
    });

    if (problematicSubs.length > 0) {
      console.log('\n⚠️  SUBSCRIPTIONS WITH PAYMENT ISSUES:');
      problematicSubs.forEach(sub => {
        console.log(`  User: ${sub.user.nickname} → Creator: ${sub.creator.nickname}`);
        console.log(`    Plan: ${sub.plan}, Status: ${sub.paymentStatus}`);
      });
    }

    // 3. Проверяем недавние подписки (последние 24 часа)
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubs = await prisma.subscription.findMany({
      where: {
        subscribedAt: { gte: recentDate }
      },
      include: {
        user: { select: { nickname: true } },
        creator: { select: { nickname: true } }
      },
      orderBy: { subscribedAt: 'desc' }
    });

    console.log(`\n📅 Recent subscriptions (last 24h): ${recentSubs.length}`);
    recentSubs.slice(0, 5).forEach(sub => {
      console.log(`  ${new Date(sub.subscribedAt).toLocaleString()}: ${sub.user.nickname} → ${sub.creator.nickname} (${sub.plan})`);
    });

    // 4. Проверяем посты с ограничениями по тирам
    const tieredPosts = await prisma.post.findMany({
      where: {
        minSubscriptionTier: { not: null }
      },
      select: {
        id: true,
        title: true,
        minSubscriptionTier: true,
        creator: {
          select: { nickname: true }
        }
      }
    });

    const tierCounts = tieredPosts.reduce((acc, post) => {
      acc[post.minSubscriptionTier] = (acc[post.minSubscriptionTier] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🔒 Posts with tier restrictions:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count} posts`);
    });

    // 5. Проверяем платные покупки постов
    const recentPurchases = await prisma.postPurchase.findMany({
      where: {
        createdAt: { gte: recentDate },
        paymentStatus: 'COMPLETED'
      },
      include: {
        user: { select: { nickname: true } },
        post: {
          select: {
            title: true,
            creator: { select: { nickname: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n💰 Recent post purchases (last 24h): ${recentPurchases.length}`);
    recentPurchases.slice(0, 5).forEach(purchase => {
      console.log(`  ${new Date(purchase.createdAt).toLocaleString()}: ${purchase.user.nickname} bought "${purchase.post.title}"`);
    });

    // 6. Проверяем дублирующиеся подписки
    const duplicates = await prisma.$queryRaw`
      SELECT "userId", "creatorId", COUNT(*) as count
      FROM "Subscription"
      WHERE "isActive" = true
      GROUP BY "userId", "creatorId"
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      console.log('\n❌ DUPLICATE ACTIVE SUBSCRIPTIONS FOUND:');
      for (const dup of duplicates) {
        const subs = await prisma.subscription.findMany({
          where: {
            userId: dup.userId,
            creatorId: dup.creatorId,
            isActive: true
          },
          include: {
            user: { select: { nickname: true } },
            creator: { select: { nickname: true } }
          }
        });
        console.log(`  ${subs[0].user.nickname} → ${subs[0].creator.nickname}: ${dup.count} active subscriptions`);
      }
    }

    // 7. Проверяем настройки тиров создателей
    const tierSettings = await prisma.creatorTierSettings.findMany({
      include: {
        creator: { select: { nickname: true } }
      }
    });

    console.log(`\n⚙️  Creators with custom tier settings: ${tierSettings.length}`);
    tierSettings.slice(0, 5).forEach(setting => {
      console.log(`  ${setting.creator.nickname}:`);
      if (setting.basicTier) {
        const basic = JSON.parse(setting.basicTier);
        console.log(`    Basic: ${basic.price} SOL`);
      }
      if (setting.premiumTier) {
        const premium = JSON.parse(setting.premiumTier);
        console.log(`    Premium: ${premium.price} SOL`);
      }
      if (setting.vipTier) {
        const vip = JSON.parse(setting.vipTier);
        console.log(`    VIP: ${vip.price} SOL`);
      }
    });

    // 8. Проверяем транзакции подписок
    const recentSubTransactions = await prisma.transaction.findMany({
      where: {
        type: 'SUBSCRIPTION',
        createdAt: { gte: recentDate }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n🔄 Recent subscription transactions: ${recentSubTransactions.length}`);
    const statusCounts = recentSubTransactions.reduce((acc, tx) => {
      acc[tx.status] = (acc[tx.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error analyzing subscriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSubscriptionBugs(); 