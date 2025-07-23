// Debug script для проверки состояния кошелька
console.log('=== WALLET STATE DEBUG ===')

// Проверяем localStorage
if (typeof window !== 'undefined') {
  console.log('localStorage wallet data:', localStorage.getItem('walletName'))
  
  // Проверяем window.solana
  console.log('window.solana:', !!window.solana)
  console.log('window.solana.isPhantom:', window.solana?.isPhantom)
  console.log('window.solana.isConnected:', window.solana?.isConnected)
  console.log('window.solana.publicKey:', window.solana?.publicKey?.toString())
}

// Экспортируем функцию для вызова из консоли
window.debugWalletState = () => {
  console.log('=== CURRENT WALLET STATE ===')
  console.log('window.solana:', window.solana)
  console.log('isConnected:', window.solana?.isConnected)
  console.log('publicKey:', window.solana?.publicKey?.toString())
} 