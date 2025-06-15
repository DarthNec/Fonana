// Конфигурация Solana и проверка переменных окружения

export const SOLANA_CONFIG = {
  // Network configuration
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',
  RPC_HOST: process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 
    'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  WS_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_WS_ENDPOINT ||
    'wss://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  
  // Platform configuration
  PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4',
  
  // Таймауты
  CONFIRMATION_TIMEOUT: 30000, // 30 секунд
  
  // Минимальные суммы
  MIN_PAYMENT_AMOUNT: 0.001, // 0.001 SOL минимум
  MIN_REFERRAL_WITHDRAWAL: 0.1, // 0.1 SOL минимум для вывода реферальных
}

// Проверка критических переменных при старте
export function validateSolanaConfig() {
  const warnings: string[] = []
  
  if (!process.env.NEXT_PUBLIC_PLATFORM_WALLET) {
    warnings.push('NEXT_PUBLIC_PLATFORM_WALLET не установлен - используется дефолтный кошелек')
  }
  
  if (!process.env.NEXT_PUBLIC_SOLANA_RPC_HOST) {
    warnings.push('NEXT_PUBLIC_SOLANA_RPC_HOST не установлен - используется встроенный QuickNode RPC')
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Solana Config Warnings:')
    warnings.forEach(w => console.warn(`   - ${w}`))
  }
  
  // Логируем текущую конфигурацию (маскируя чувствительные данные)
  console.info('📡 Solana Configuration:')
  console.info(`   RPC: ${SOLANA_CONFIG.RPC_HOST.substring(0, 30)}...`)
  console.info(`   Platform Wallet: ${SOLANA_CONFIG.PLATFORM_WALLET.substring(0, 8)}...`)
  console.info(`   Network: ${SOLANA_CONFIG.NETWORK}`)
  
  return warnings
}

// Валидация Solana адреса
export function isValidSolanaAddress(address: string | null | undefined): boolean {
  if (!address) return false
  
  try {
    // Проверяем длину (32 байта в base58 = 44 символа)
    if (address.length < 32 || address.length > 44) return false
    
    // Проверяем символы base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
    return base58Regex.test(address)
  } catch {
    return false
  }
} 