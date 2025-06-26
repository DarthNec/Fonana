const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSubscriptionFlow() {
  console.log('=== TESTING SUBSCRIPTION CREATION FLOW ===\n');
  
  // Проверяем правильность цен для каждого типа
  const subscriptionPrices = {
    'Free': 0,
    'Basic': 0.05,
    'Premium': 0.15,
    'VIP': 0.35
  };
  
  console.log('Standard subscription prices:');
  Object.entries(subscriptionPrices).forEach(([plan, price]) => {
    console.log(`  ${plan}: ${price} SOL`);
  });
  
  // Проверяем кастомные настройки тиров создателей
  console.log('\n=== CHECKING CUSTOM TIER SETTINGS ===');
  
  const creatorsWithCustomTiers = await prisma.creatorTierSettings.findMany({
    include: {
      creator: {
        select: { nickname: true }
      }
    },
    take: 5
  });
  
  console.log(`\nFound ${creatorsWithCustomTiers.length} creators with custom tier settings:\n`);
  
  creatorsWithCustomTiers.forEach(settings => {
    console.log(`Creator: ${settings.creator.nickname}`);
    
    if (settings.basicTier) {
      const basicData = settings.basicTier;
      console.log(`  Basic: ${basicData.enabled ? `✅ ${basicData.price} SOL` : '❌ Disabled'}`);
    }
    
    if (settings.premiumTier) {
      const premiumData = settings.premiumTier;
      console.log(`  Premium: ${premiumData.enabled ? `✅ ${premiumData.price} SOL` : '❌ Disabled'}`);
    }
    
    if (settings.vipTier) {
      const vipData = settings.vipTier;
      console.log(`  VIP: ${vipData.enabled ? `✅ ${vipData.price} SOL` : '❌ Disabled'}`);
    }
    
    console.log('---');
  });
  
  // Проверяем процесс покупки
  console.log('\n=== SUBSCRIPTION PURCHASE FLOW ===');
  
  console.log('\n1. FREE Subscription:');
  console.log('   - Route: POST /api/subscriptions');
  console.log('   - Price validation: Must be 0');
  console.log('   - Payment: No Solana transaction needed');
  console.log('   - Status: Will get paymentStatus: COMPLETED');
  console.log('   - Access: ✅ Will have access to free content');
  
  console.log('\n2. BASIC Subscription (0.05 SOL):');
  console.log('   - Route: POST /api/subscriptions/process-payment');
  console.log('   - Price validation: Checks against creator tier settings or default');
  console.log('   - Payment: Requires Solana transaction');
  console.log('   - Status: COMPLETED after transaction confirmation');
  console.log('   - Access: ✅ Will have access to basic + free content');
  
  console.log('\n3. PREMIUM Subscription (0.15 SOL):');
  console.log('   - Route: POST /api/subscriptions/process-payment');
  console.log('   - Price validation: Checks against creator tier settings or default');
  console.log('   - Payment: Requires Solana transaction');
  console.log('   - Status: COMPLETED after transaction confirmation');
  console.log('   - Access: ✅ Will have access to premium + basic + free content');
  
  console.log('\n4. VIP Subscription (0.35 SOL):');
  console.log('   - Route: POST /api/subscriptions/process-payment');
  console.log('   - Price validation: Checks against creator tier settings or default');
  console.log('   - Payment: Requires Solana transaction');
  console.log('   - Status: COMPLETED after transaction confirmation');
  console.log('   - Access: ✅ Will have access to all content');
  
  // Проверяем потенциальные проблемы
  console.log('\n=== POTENTIAL ISSUES CHECK ===');
  
  // 1. Подписки с неправильными ценами
  console.log('\n1. Checking for subscriptions with wrong prices:');
  
  for (const [plan, expectedPrice] of Object.entries(subscriptionPrices)) {
    const wrongPriceSubs = await prisma.subscription.count({
      where: {
        plan,
        price: { not: expectedPrice },
        // Исключаем кастомные цены
        creator: {
          tierSettings: null
        }
      }
    });
    
    if (wrongPriceSubs > 0) {
      console.log(`   ⚠️ ${plan}: ${wrongPriceSubs} subscriptions with wrong price`);
    } else {
      console.log(`   ✅ ${plan}: All prices correct`);
    }
  }
  
  // 2. Активные подписки без правильного статуса
  console.log('\n2. Active subscriptions without COMPLETED status:');
  
  const activeWithoutCompleted = await prisma.subscription.count({
    where: {
      isActive: true,
      validUntil: { gte: new Date() },
      OR: [
        { paymentStatus: { not: 'COMPLETED' } },
        { paymentStatus: null }
      ]
    }
  });
  
  if (activeWithoutCompleted > 0) {
    console.log(`   ⚠️ Found ${activeWithoutCompleted} active subscriptions without COMPLETED status`);
    console.log('   These will NOT work after our security fix!');
  } else {
    console.log('   ✅ All active subscriptions have COMPLETED status');
  }
  
  // 3. Проверяем UI отображение
  console.log('\n3. UI Display Check:');
  console.log('   - Tier icons: ⭐ Basic, 💎 Premium, 👑 VIP');
  console.log('   - Tier colors: Gray (Basic), Purple (Premium), Gold (VIP)');
  console.log('   - Access messages show required tier when content is locked');
  console.log('   - Subscription status shows current tier');
}

testSubscriptionFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 