import { Connection, ConnectionConfig } from '@solana/web3.js'

// Основной RPC endpoint - используем Helius (надежный RPC провайдер)
const PRIMARY_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  'https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0'

// Резервные RPC endpoints - надежные публичные endpoints
const FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana.public-rpc.com',
  'https://rpc.ankr.com/solana'
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
  } catch (error: any) {
    console.error('[Solana Connection] RPC connection error, trying fallback:', error)
    
    // Если это 403 ошибка или Failed to fetch, переключаемся на fallback
    if (error?.message?.includes('403') || 
        error?.message?.includes('Access forbidden') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('too many requests') ||
        error?.name === 'TypeError') {
      console.log('[Solana Connection] Network error detected, switching to fallback RPC:', error.message)
      await switchToFallbackRpc()
    }
    
    // Проверяем новое соединение
    try {
      await connection.getSlot()
      console.log('[Solana Connection] Fallback RPC connection successful')
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
export { connection, connectionService } from '@/lib/services/ConnectionService'

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