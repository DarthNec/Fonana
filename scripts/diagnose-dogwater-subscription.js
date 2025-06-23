const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseDogwaterSubscription() {
  try {
    console.log('=== DOGWATER SUBSCRIPTION DIAGNOSIS ===\n');
    
    // Найти пользователя Dogwater
    const dogwater = await prisma.user.findFirst({
      where: {
        OR: [
          { nickname: { equals: 'Dogwater', mode: 'insensitive' } },
          { nickname: { equals: 'dogwater', mode: 'insensitive' } }
        ]
      },
      include: {
        subscriptions: {
          include: {
            creator: {
              select: {
                nickname: true,
                fullName: true,
                wallet: true
              }
            }
          },
          orderBy: { subscribedAt: 'desc' }
        }
      }
    });
    
    if (!dogwater) {
      console.log('❌ User Dogwater not found');
      return;
    }
    
    console.log(`Found user: ${dogwater.nickname} (${dogwater.id})`);
    console.log(`Wallet: ${dogwater.wallet || dogwater.solanaWallet}\n`);
    
    // Найти lafufu
    const lafufu = await prisma.user.findFirst({
      where: {
        OR: [
          { nickname: { equals: 'lafufu', mode: 'insensitive' } },
          { nickname: { equals: 'Lafufu', mode: 'insensitive' } }
        ]
      }
    });
    
    if (!lafufu) {
      console.log('❌ Creator lafufu not found');
    } else {
      console.log(`\nFound creator lafufu: ${lafufu.nickname} (${lafufu.id})`);
      
      // Проверить настройки тиров lafufu
      const tierSettings = await prisma.creatorTierSettings.findUnique({
        where: { creatorId: lafufu.id }
      });
      
      if (tierSettings) {
        console.log('\n📊 LAFUFU TIER SETTINGS:');
        if (tierSettings.basicTier) {
          console.log('Basic:', JSON.stringify(tierSettings.basicTier, null, 2));
        }
        if (tierSettings.premiumTier) {
          console.log('Premium:', JSON.stringify(tierSettings.premiumTier, null, 2));
        }
        if (tierSettings.vipTier) {
          console.log('VIP:', JSON.stringify(tierSettings.vipTier, null, 2));
        }
      }
    }
    
    console.log('\n📝 ALL DOGWATER SUBSCRIPTIONS:');
    
    for (const sub of dogwater.subscriptions) {
      console.log('\n------------------------');
      console.log(`Creator: ${sub.creator.nickname || sub.creator.fullName}`);
      console.log(`Plan: ${sub.plan}`);
      console.log(`Price: ${sub.price} ${sub.currency}`);
      console.log(`Status: ${sub.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`Payment Status: ${sub.paymentStatus}`);
      console.log(`Subscribed: ${sub.subscribedAt.toLocaleString()}`);
      console.log(`Valid Until: ${sub.validUntil.toLocaleString()}`);
      console.log(`TX Signature: ${sub.txSignature || 'No signature'}`);
      
      if (sub.platformFee !== null) {
        console.log(`Platform Fee: ${sub.platformFee} SOL`);
      }
      if (sub.creatorAmount !== null) {
        console.log(`Creator Amount: ${sub.creatorAmount} SOL`);
      }
    }
    
    // Проверить транзакции для lafufu
    if (lafufu) {
      console.log('\n💸 TRANSACTIONS INVOLVING LAFUFU:');
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { 
              subscription: {
                creatorId: lafufu.id,
                userId: dogwater.id
              }
            },
            {
              metadata: {
                path: '$.creatorId',
                equals: lafufu.id
              }
            }
          ]
        },
        include: {
          subscription: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      for (const tx of transactions) {
        console.log('\n------------------------');
        console.log(`TX: ${tx.txSignature.slice(0, 20)}...`);
        console.log(`Amount: ${tx.amount} ${tx.currency}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Created: ${tx.createdAt.toLocaleString()}`);
        if (tx.metadata) {
          console.log('Metadata:', JSON.stringify(tx.metadata, null, 2));
        }
      }
    }
    
    // Проверить конкретную подписку на lafufu
    if (lafufu) {
      const specificSub = await prisma.subscription.findUnique({
        where: {
          userId_creatorId: {
            userId: dogwater.id,
            creatorId: lafufu.id
          }
        }
      });
      
      if (specificSub) {
        console.log('\n🎯 SPECIFIC SUBSCRIPTION TO LAFUFU:');
        console.log(JSON.stringify(specificSub, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDogwaterSubscription(); 