const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDogwaterVizerTransactions() {
  try {
    // Найдем пользователей
    const dogwater = await prisma.user.findFirst({ 
      where: { nickname: 'Dogwater' },
      select: { id: true, nickname: true, wallet: true }
    });
    
    const vizer36 = await prisma.user.findFirst({ 
      where: { nickname: 'vizer36' },
      select: { id: true, nickname: true, wallet: true }
    });
    
    console.log('=== USERS ===');
    console.log('Dogwater:', dogwater);
    console.log('Vizer36:', vizer36);
    
    // Найдем все транзакции от Dogwater
    const dogwaterTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: dogwater.wallet },
          { senderId: dogwater.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true
      }
    });
    
    console.log('\n=== ALL DOGWATER TRANSACTIONS ===');
    dogwaterTransactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`, {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        fromWallet: tx.fromWallet,
        toWallet: tx.toWallet,
        senderId: tx.senderId,
        receiverId: tx.receiverId,
        subscriptionId: tx.subscriptionId,
        createdAt: tx.createdAt,
        confirmedAt: tx.confirmedAt
      });
      
      if (tx.subscription) {
        console.log('  Related subscription:', {
          id: tx.subscription.id,
          plan: tx.subscription.plan,
          creatorId: tx.subscription.creatorId,
          price: tx.subscription.price,
          isActive: tx.subscription.isActive
        });
      }
    });
    
    // Найдем транзакции связанные с vizer36
    const vizerRelatedTx = dogwaterTransactions.filter(tx => 
      tx.toWallet === vizer36.wallet || 
      tx.receiverId === vizer36.id ||
      tx.subscription?.creatorId === vizer36.id
    );
    
    console.log('\n=== VIZER36 RELATED TRANSACTIONS ===');
    if (vizerRelatedTx.length === 0) {
      console.log('No transactions found between Dogwater and vizer36');
    } else {
      vizerRelatedTx.forEach((tx, index) => {
        console.log(`\nTransaction ${index + 1}:`, tx);
      });
    }
    
    // Проверим все подписки Dogwater с деталями
    const allSubscriptions = await prisma.subscription.findMany({
      where: { userId: dogwater.id },
      include: {
        creator: {
          select: { nickname: true, id: true }
        },
        transactions: true
      },
      orderBy: { subscribedAt: 'desc' }
    });
    
    console.log('\n=== ALL DOGWATER SUBSCRIPTIONS WITH DETAILS ===');
    allSubscriptions.forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1}:`, {
        id: sub.id,
        creator: sub.creator.nickname,
        plan: sub.plan,
        price: sub.price,
        isActive: sub.isActive,
        paymentStatus: sub.paymentStatus,
        subscribedAt: sub.subscribedAt,
        validUntil: sub.validUntil,
        hasTransactions: sub.transactions.length > 0
      });
      
      if (sub.transactions.length > 0) {
        console.log('  Transactions:', sub.transactions);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDogwaterVizerTransactions(); 