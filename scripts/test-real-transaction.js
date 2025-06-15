const {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction
} = require('@solana/web3.js');

const QUICKNODE_RPC = 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/';
const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4';

async function testRealTransaction() {
  console.log('🧪 Тестирование создания реальной транзакции...\n');
  
  try {
    const connection = new Connection(QUICKNODE_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: 'wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/'
    });
    
    // 1. Проверяем соединение
    console.log('1️⃣ Проверка соединения с RPC...');
    const version = await connection.getVersion();
    console.log('✅ Подключено к Solana:', version['solana-core']);
    
    // 2. Получаем текущий слот
    const currentSlot = await connection.getSlot();
    console.log(`✅ Текущий слот: ${currentSlot}`);
    
    // 3. Получаем blockhash
    console.log('\n2️⃣ Получение blockhash...');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log('✅ Blockhash:', blockhash);
    console.log('✅ Last valid block height:', lastValidBlockHeight);
    
    // 4. Проверяем баланс
    console.log('\n3️⃣ Проверка балансов...');
    const platformPubkey = new PublicKey(PLATFORM_WALLET);
    const balance = await connection.getBalance(platformPubkey);
    console.log('💰 Баланс платформы:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    // 5. Создаем тестовую транзакцию
    console.log('\n4️⃣ Создание тестовой транзакции...');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = platformPubkey;
    
    // Добавляем простую инструкцию (перевод 0.001 SOL самому себе для теста)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: platformPubkey,
        toPubkey: platformPubkey,
        lamports: 0.001 * LAMPORTS_PER_SOL
      })
    );
    
    console.log('✅ Транзакция создана:');
    console.log('   - Blockhash:', transaction.recentBlockhash);
    console.log('   - Last valid height:', transaction.lastValidBlockHeight);
    console.log('   - Fee payer:', transaction.feePayer.toBase58());
    console.log('   - Instructions:', transaction.instructions.length);
    
    // 6. Симулируем транзакцию
    console.log('\n5️⃣ Симуляция транзакции...');
    try {
      const simulation = await connection.simulateTransaction(transaction);
      console.log('📊 Результат симуляции:');
      console.log('   - Ошибка:', simulation.value.err ? JSON.stringify(simulation.value.err) : 'Нет');
      console.log('   - Логи:', simulation.value.logs?.slice(0, 5).join('\n     '));
      console.log('   - Units consumed:', simulation.value.unitsConsumed);
      
      if (simulation.value.err) {
        console.error('❌ Симуляция показала ошибку:', simulation.value.err);
        return;
      }
    } catch (simError) {
      console.error('❌ Ошибка при симуляции:', simError);
    }
    
    // 7. Проверяем параметры для отправки
    console.log('\n6️⃣ Рекомендуемые параметры отправки:');
    console.log('   - commitment: "confirmed"');
    console.log('   - preflightCommitment: "confirmed"');
    console.log('   - skipPreflight: false');
    console.log('   - maxRetries: 3');
    
    // 8. Получаем приоритетные комиссии
    console.log('\n7️⃣ Анализ комиссий...');
    try {
      const fees = await connection.getRecentPrioritizationFees();
      if (fees && fees.length > 0) {
        const avgFee = fees.reduce((sum, f) => sum + f.prioritizationFee, 0) / fees.length;
        console.log('💸 Приоритетные комиссии:');
        console.log(`   - Средняя: ${avgFee} microlamports`);
        console.log(`   - Минимальная: ${Math.min(...fees.map(f => f.prioritizationFee))}`);
        console.log(`   - Максимальная: ${Math.max(...fees.map(f => f.prioritizationFee))}`);
      }
    } catch (feeError) {
      console.error('Ошибка получения комиссий:', feeError);
    }
    
    // 9. Проверяем минимальный баланс для rent
    console.log('\n8️⃣ Проверка минимального баланса...');
    const minBalance = await connection.getMinimumBalanceForRentExemption(0);
    console.log('💵 Минимальный баланс для rent exemption:', minBalance / LAMPORTS_PER_SOL, 'SOL');
    
    console.log('\n✨ Анализ завершен!');
    console.log('\n📝 Возможные причины проблем с транзакциями:');
    console.log('1. Недостаточная комиссия (добавьте приоритетную комиссию)');
    console.log('2. Проблемы с WebSocket соединением');
    console.log('3. Транзакция не отправляется в сеть (проблема с wallet adapter)');
    console.log('4. Истекший blockhash (нужно быстрее отправлять после создания)');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    if (error.stack) {
      console.error('\nСтек:', error.stack);
    }
  }
}

testRealTransaction(); 