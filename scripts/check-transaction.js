#!/usr/bin/env node

const { Connection } = require('@solana/web3.js')

async function checkTransaction(signature) {
  console.log('\n🔍 Проверка транзакции:', signature)
  console.log('=' * 60)
  
  // Используем QuickNode RPC
  const connection = new Connection(
    'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
    'confirmed'
  )
  
  try {
    // Сначала проверяем статус подписи
    console.log('\n1. Проверка статуса подписи...')
    const status = await connection.getSignatureStatus(signature)
    console.log('Статус:', JSON.stringify(status, null, 2))
    
    // Пытаемся получить детали транзакции
    console.log('\n2. Получение деталей транзакции...')
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    })
    
    if (!tx) {
      console.log('❌ Транзакция не найдена в блокчейне!')
      return
    }
    
    console.log('✅ Транзакция найдена!')
    console.log('Слот:', tx.slot)
    console.log('Время блока:', tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'Неизвестно')
    console.log('Статус:', tx.meta?.err ? `Ошибка: ${JSON.stringify(tx.meta.err)}` : 'Успешно')
    
    // Показываем балансы до и после
    if (tx.meta) {
      console.log('\n3. Изменения балансов:')
      const accountKeys = tx.transaction.message.getAccountKeys()
      
      for (let i = 0; i < accountKeys.staticAccountKeys.length; i++) {
        const preBalance = tx.meta.preBalances[i] / 1e9 // Конвертируем в SOL
        const postBalance = tx.meta.postBalances[i] / 1e9
        const diff = postBalance - preBalance
        
        if (diff !== 0) {
          console.log(`${accountKeys.staticAccountKeys[i].toBase58()}: ${diff > 0 ? '+' : ''}${diff.toFixed(4)} SOL`)
        }
      }
    }
    
    // Показываем логи
    if (tx.meta?.logMessages && tx.meta.logMessages.length > 0) {
      console.log('\n4. Логи транзакции:')
      tx.meta.logMessages.forEach(log => console.log(' ', log))
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке транзакции:', error.message)
  }
}

// Проверяем переданную транзакцию
const signature = process.argv[2]
if (!signature) {
  console.log('Использование: node check-transaction.js <TRANSACTION_SIGNATURE>')
  process.exit(1)
}

checkTransaction(signature) 