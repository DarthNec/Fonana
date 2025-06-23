const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCustomTierSettings() {
  try {
    console.log('=== ПРОВЕРКА КАСТОМНЫХ НАСТРОЕК ТИРОВ ===\n');
    
    // 1. Проверяем конкретных пользователей
    const targetUsers = ['dogwater', 'vizer36', 'lafufu'];
    
    for (const nickname of targetUsers) {
      const user = await prisma.user.findFirst({
        where: { 
          nickname: { equals: nickname, mode: 'insensitive' } 
        }
      });
      
      if (!user) {
        console.log(`❌ ${nickname} - не найден`);
        continue;
      }
      
      console.log(`\n${nickname.toUpperCase()}:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Wallet: ${user.solanaWallet || user.wallet}`);
      console.log(`- Is Creator: ${user.isCreator}`);
      
      const tierSettings = await prisma.creatorTierSettings.findUnique({
        where: { creatorId: user.id }
      });
      
      if (tierSettings) {
        console.log('✅ Кастомные тиры найдены:');
        
        if (tierSettings.basicTier) {
          const basic = tierSettings.basicTier;
          console.log(`  Basic: ${basic.price || 'нет цены'} SOL (enabled: ${basic.enabled !== false})`);
        } else {
          console.log('  Basic: не настроен');
        }
        
        if (tierSettings.premiumTier) {
          const premium = tierSettings.premiumTier;
          console.log(`  Premium: ${premium.price || 'нет цены'} SOL (enabled: ${premium.enabled !== false})`);
        } else {
          console.log('  Premium: не настроен');
        }
        
        if (tierSettings.vipTier) {
          const vip = tierSettings.vipTier;
          console.log(`  VIP: ${vip.price || 'нет цены'} SOL (enabled: ${vip.enabled !== false})`);
        } else {
          console.log('  VIP: не настроен');
        }
        
        console.log('\nRAW JSON:');
        console.log(JSON.stringify(tierSettings, null, 2));
      } else {
        console.log('❌ Кастомные тиры НЕ настроены - используются дефолтные (0.05, 0.15, 0.35)');
      }
    }
    
    // 2. Проверяем всех создателей с кастомными тирами
    console.log('\n\n=== ВСЕ СОЗДАТЕЛИ С КАСТОМНЫМИ ТИРАМИ ===\n');
    
    const allCustomTiers = await prisma.creatorTierSettings.findMany({
      include: {
        creator: {
          select: {
            nickname: true
          }
        }
      }
    });
    
    console.log(`Найдено ${allCustomTiers.length} создателей с кастомными тирами:`);
    
    allCustomTiers.forEach(setting => {
      console.log(`\n${setting.creator.nickname}:`);
      
      const prices = [];
      if (setting.basicTier?.price) prices.push(`Basic: ${setting.basicTier.price}`);
      if (setting.premiumTier?.price) prices.push(`Premium: ${setting.premiumTier.price}`);
      if (setting.vipTier?.price) prices.push(`VIP: ${setting.vipTier.price}`);
      
      console.log(`  ${prices.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomTierSettings(); 