const { Connection, PublicKey } = require('@solana/web3.js')

const RPC_URL = 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/'
const ACCOUNT_TO_CHECK = 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'

async function checkAccount() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const pubkey = new PublicKey(ACCOUNT_TO_CHECK)
  
  console.log(`🔍 Проверка аккаунта: ${ACCOUNT_TO_CHECK}`)
  console.log('')
  
  try {
    // 1. Проверяем информацию об аккаунте
    const accountInfo = await connection.getAccountInfo(pubkey)
    
    if (accountInfo) {
      console.log('✅ Аккаунт существует!')
      console.log(`   Баланс: ${accountInfo.lamports / 1e9} SOL`)
      console.log(`   Владелец программы: ${accountInfo.owner.toBase58()}`)
      console.log(`   Executable: ${accountInfo.executable}`)
      console.log(`   Размер данных: ${accountInfo.data.length} байт`)
    } else {
      console.log('❌ Аккаунт не найден (getAccountInfo вернул null)')
    }
    
    // 2. Проверяем баланс напрямую
    console.log('\n📊 Проверка баланса напрямую:')
    const balance = await connection.getBalance(pubkey)
    console.log(`   Баланс: ${balance / 1e9} SOL (${balance} lamports)`)
    
    // 3. Проверяем минимальную ренту
    const minRent = await connection.getMinimumBalanceForRentExemption(0)
    console.log(`\n💰 Минимальная рента: ${minRent / 1e9} SOL`)
    
    if (balance >= minRent) {
      console.log('   ✅ Баланс достаточен для ренты')
    } else {
      console.log('   ❌ Баланс меньше минимальной ренты')
    }
    
    // 4. Проверяем через разные RPC
    console.log('\n🌐 Проверка через публичный RPC:')
    const publicConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    const publicAccountInfo = await publicConnection.getAccountInfo(pubkey)
    
    if (publicAccountInfo) {
      console.log('   ✅ Аккаунт найден через публичный RPC')
    } else {
      console.log('   ❌ Аккаунт НЕ найден через публичный RPC')
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

checkAccount() 