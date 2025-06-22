const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVizer36Tiers() {
  try {
    const vizer36 = await prisma.user.findFirst({ 
      where: { nickname: 'vizer36' },
      select: { id: true, nickname: true, isCreator: true }
    });
    
    console.log('=== VIZER36 USER ===');
    console.log(vizer36);
    
    // Проверим настройки тиров
    const tierSettings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId: vizer36.id }
    });
    
    console.log('\n=== TIER SETTINGS ===');
    if (tierSettings) {
      console.log('Basic Tier:', tierSettings.basicTier);
      console.log('Premium Tier:', tierSettings.premiumTier);
      console.log('VIP Tier:', tierSettings.vipTier);
    } else {
      console.log('No custom tier settings found. Using default tiers:');
      console.log('Basic: 5 SOL');
      console.log('Premium: 10 SOL');
      console.log('VIP: 20 SOL');
    }
    
    // Проверим все активные подписки на vizer36
    const subscriptions = await prisma.subscription.findMany({
      where: { 
        creatorId: vizer36.id,
        isActive: true
      },
      include: {
        user: {
          select: { nickname: true }
        }
      }
    });
    
    console.log('\n=== ACTIVE SUBSCRIPTIONS ===');
    subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. User: ${sub.user.nickname}`);
      console.log(`   Plan: ${sub.plan}`);
      console.log(`   Price: ${sub.price} SOL`);
      console.log(`   Payment Status: ${sub.paymentStatus}`);
      console.log(`   Valid Until: ${sub.validUntil}`);
    });
    
    // Проверим посты с ограничениями
    const restrictedPosts = await prisma.post.findMany({
      where: {
        creatorId: vizer36.id,
        minSubscriptionTier: { not: null }
      },
      select: {
        id: true,
        title: true,
        minSubscriptionTier: true,
        isLocked: true
      }
    });
    
    console.log('\n=== RESTRICTED POSTS ===');
    const tiers = { basic: 0, premium: 0, vip: 0 };
    restrictedPosts.forEach(post => {
      if (post.minSubscriptionTier) {
        tiers[post.minSubscriptionTier]++;
      }
    });
    console.log('Basic tier posts:', tiers.basic);
    console.log('Premium tier posts:', tiers.premium);
    console.log('VIP tier posts:', tiers.vip);
    console.log('Total restricted posts:', restrictedPosts.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVizer36Tiers(); 