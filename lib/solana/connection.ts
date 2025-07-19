import { Connection, ConnectionConfig } from '@solana/web3.js'

// Основной RPC endpoint - обновленный QuickNode
const PRIMARY_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/'

// Резервные RPC endpoints - тоже обновленные
const FALLBACK_RPCS = [
  'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',  
  'https://api.devnet.solana.com' // fallback на devnet если mainnet не работает
]

const connectionConfig: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000, // 2 минуты
  disableRetryOnRateLimit: false
}

console.log('[Solana Connection] Primary RPC:', PRIMARY_RPC)
console.log('[Solana Connection] Fallback RPCs:', FALLBACK_RPCS)

// Создаем основное соединение
let connection = new Connection(PRIMARY_RPC, connectionConfig)
let currentRpcIndex = -1 // -1 означает использование PRIMARY_RPC

// Функция для переключения на резервный RPC
async function switchToFallbackRpc() {
  currentRpcIndex++
  
  if (currentRpcIndex >= FALLBACK_RPCS.length) {
    // Возвращаемся к основному RPC
    currentRpcIndex = -1
    connection = new Connection(PRIMARY_RPC, connectionConfig)
    console.log('[Solana Connection] Switching back to primary RPC:', PRIMARY_RPC)
    return
  }
  
  const fallbackRpc = FALLBACK_RPCS[currentRpcIndex]
  console.log(`[Solana Connection] Switching to fallback RPC: ${fallbackRpc}`)
  connection = new Connection(fallbackRpc, connectionConfig)
}

// Обертка для автоматического переключения RPC при ошибках
export async function getConnectionWithFallback(): Promise<Connection> {
  try {
    // Проверяем текущее соединение
    await connection.getSlot()
    return connection
  } catch (error) {
    console.error('[Solana Connection] RPC connection error, trying fallback:', error)
    await switchToFallbackRpc()
    
    // Проверяем новое соединение
    try {
      await connection.getSlot()
      return connection
    } catch (fallbackError) {
      console.error('[Solana Connection] Fallback RPC also failed:', fallbackError)
      // Продолжаем с текущим соединением
      return connection
    }
  }
}

export function getConnection(): Connection {
  return connection
}

// Экспортируем connection напрямую для обратной совместимости
export { connection }

// Helper to get network type
export function getNetworkUrl(): string {
  return PRIMARY_RPC
}

// Helper to get commitment level
export function getCommitment(): 'processed' | 'confirmed' | 'finalized' {
  return 'confirmed'
}

// Helper to get network type
export const getNetwork = () => {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
}

// Helper to check if we're on mainnet
export const isMainnet = () => {
  return getNetwork() === 'mainnet-beta'
} 