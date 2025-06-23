const { Connection, PublicKey, ComputeBudgetProgram } = require('@solana/web3.js')

const RPC_URL = 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/'
const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'

async function testConnection() {
  console.log('🔍 Тестирование подключения к Solana...\n')
  
  try {
    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000, // 2 минуты
      disableRetryOnRateLimit: false
    })
    
    // 1. Проверка подключения
    console.log('1. Проверка подключения к RPC...')
    const slot = await connection.getSlot()
    console.log(`✅ Подключен! Текущий слот: ${slot}`)
    
    // 2. Проверка версии
    console.log('\n2. Версия Solana...')
    const version = await connection.getVersion()
    console.log(`✅ Версия: ${version['solana-core']}`)
    
    // 3. Проверка баланса платформы
    console.log('\n3. Баланс кошелька платформы...')
    const platformPubkey = new PublicKey(PLATFORM_WALLET)
    const balance = await connection.getBalance(platformPubkey)
    console.log(`✅ Баланс: ${balance / 1e9} SOL`)
    
    // 4. Проверка приоритетных комиссий
    console.log('\n4. Текущие приоритетные комиссии...')
    const fees = await connection.getRecentPrioritizationFees()
    if (fees && fees.length > 0) {
      const nonZeroFees = fees.filter(f => f.prioritizationFee > 0)
      if (nonZeroFees.length > 0) {
        const feeValues = nonZeroFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
        console.log(`✅ Минимальная: ${feeValues[0]} microlamports`)
        console.log(`   Медиана: ${feeValues[Math.floor(feeValues.length / 2)]} microlamports`)
        console.log(`   90-й перцентиль: ${feeValues[Math.floor(feeValues.length * 0.9)]} microlamports`)
        console.log(`   Максимальная: ${feeValues[feeValues.length - 1]} microlamports`)
      }
    }
    
    // 5. Проверка blockhash
    console.log('\n5. Получение текущего blockhash...')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    console.log(`✅ Blockhash: ${blockhash}`)
    console.log(`   Действителен до блока: ${lastValidBlockHeight}`)
    
    // 6. Проверка минимальной ренты
    console.log('\n6. Минимальная рента для аккаунта...')
    const minRent = await connection.getMinimumBalanceForRentExemption(0)
    console.log(`✅ Минимальная рента: ${minRent / 1e9} SOL`)
    
    // 7. Проверка производительности RPC
    console.log('\n7. Проверка производительности RPC...')
    const start = Date.now()
    await connection.getSlot()
    const latency = Date.now() - start
    console.log(`✅ Задержка: ${latency}ms`)
    
    // 8. Рекомендации
    console.log('\n📋 РЕКОМЕНДАЦИИ:')
    console.log('- Используйте приоритетную комиссию >= 600000 microlamports')
    console.log('- Всегда получайте свежий blockhash перед отправкой')
    console.log('- Используйте retry логику (3 попытки)')
    console.log('- Добавляйте ренту для новых аккаунтов')
    console.log('- Используйте confirmTransaction с blockhash и lastValidBlockHeight')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testConnection() 