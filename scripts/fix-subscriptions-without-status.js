const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubscriptionsWithoutStatus() {
  console.log('=== FIXING SUBSCRIPTIONS WITHOUT PAYMENT STATUS ===\n');
  
  // Получаем все подписки без paymentStatus
  const subsWithoutStatus = await prisma.subscription.findMany({
    where: {
      paymentStatus: null
    },
    include: {
      transactions: true
    }
  });
  
  console.log(`Found ${subsWithoutStatus.length} subscriptions without paymentStatus\n`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const sub of subsWithoutStatus) {
    // Определяем правильный статус
    let newStatus = 'PENDING';
    
    // Если есть связанная транзакция
    if (sub.transactions && sub.transactions.length > 0) {
      const confirmedTx = sub.transactions.find(tx => tx.status === 'CONFIRMED');
      if (confirmedTx) {
        newStatus = 'COMPLETED';
      }
    }
    // Если есть txSignature, считаем оплаченной
    else if (sub.txSignature) {
      newStatus = 'COMPLETED';
    }
    // Если бесплатная подписка
    else if (sub.price === 0) {
      newStatus = 'COMPLETED';
    }
    
    // Обновляем статус
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { paymentStatus: newStatus }
    });
    
    if (newStatus === 'COMPLETED') {
      fixed++;
    } else {
      skipped++;
    }
    
    console.log(`${newStatus === 'COMPLETED' ? '✓' : '⚠'} Updated subscription ${sub.id} to ${newStatus}`);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Fixed (set to COMPLETED): ${fixed}`);
  console.log(`⚠️ Set to PENDING: ${skipped}`);
  console.log(`Total processed: ${subsWithoutStatus.length}`);
}

fixSubscriptionsWithoutStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 