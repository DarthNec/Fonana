// Тестовый скрипт для проверки подключения кошелька
console.log('🎯 [TEST SCRIPT] Wallet connection test started')

// Проверяем наличие window объекта
if (typeof window !== 'undefined') {
  console.log('✅ Window object available')
  
  // Проверяем localStorage
  try {
    const testKey = 'test_wallet_connection'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    console.log('✅ localStorage available')
  } catch (error) {
    console.error('❌ localStorage not available:', error)
  }
  
  // Проверяем наличие кошелька
  if (window.solana) {
    console.log('✅ Solana wallet detected')
    console.log('📊 Solana wallet info:', {
      isConnected: window.solana.isConnected,
      publicKey: window.solana.publicKey?.toBase58(),
      walletName: window.solana.name
    })
  } else {
    console.log('❌ Solana wallet not detected')
  }
  
  // Проверяем Zustand store
  if (window.__ZUSTAND__) {
    console.log('✅ Zustand store detected')
  } else {
    console.log('❌ Zustand store not detected')
  }
  
} else {
  console.log('❌ Window object not available (SSR)')
}

console.log('🎯 [TEST SCRIPT] Wallet connection test completed') 