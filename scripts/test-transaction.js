const {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

const QUICKNODE_RPC = 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/';
const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4';

async function testTransaction() {
  console.log('🔧 Тестирование создания и отправки транзакции...\n');
  
  try {
    const connection = new Connection(QUICKNODE_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    
    console.log('📡 Подключение к RPC:', QUICKNODE_RPC);
    
    // Проверяем соединение
    const version = await connection.getVersion();
    console.log('✅ Версия Solana:', version['solana-core']);
    
    // Получаем blockhash
    console.log('\n📦 Получение blockhash...');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log('✅ Blockhash:', blockhash);
    console.log('✅ Last valid block height:', lastValidBlockHeight);
    
    // Проверяем баланс кошелька платформы
    const platformPubkey = new PublicKey(PLATFORM_WALLET);
    const balance = await connection.getBalance(platformPubkey);
    console.log('\n💰 Баланс кошелька платформы:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    // Создаем тестовую транзакцию (без отправки)
    console.log('\n📝 Создание тестовой транзакции...');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Добавляем инструкцию (например, отправка 0 SOL самому себе)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: platformPubkey,
        toPubkey: platformPubkey,
        lamports: 0
      })
    );
    
    console.log('✅ Транзакция создана');
    console.log('   - Recent blockhash:', transaction.recentBlockhash);
    console.log('   - Last valid block height:', transaction.lastValidBlockHeight);
    console.log('   - Instructions:', transaction.instructions.length);
    
    // Проверяем параметры для отправки
    console.log('\n🔍 Рекомендуемые параметры для отправки:');
    console.log('   - preflightCommitment: "confirmed"');
    console.log('   - skipPreflight: false');
    console.log('   - maxRetries: 3');
    
    // Получаем рекомендуемую комиссию
    const fees = await connection.getRecentPrioritizationFees();
    console.log('\n💸 Рекомендуемые приоритетные комиссии:');
    if (fees && fees.length > 0) {
      const avgFee = fees.reduce((sum, f) => sum + f.prioritizationFee, 0) / fees.length;
      console.log('   - Средняя комиссия:', avgFee, 'microlamports');
      console.log('   - Минимальная:', Math.min(...fees.map(f => f.prioritizationFee)));
      console.log('   - Максимальная:', Math.max(...fees.map(f => f.prioritizationFee)));
    }
    
    console.log('\n✨ Тест завершен успешно!');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    if (error.stack) {
      console.error('\nСтек вызовов:', error.stack);
    }
  }
}

testTransaction(); 