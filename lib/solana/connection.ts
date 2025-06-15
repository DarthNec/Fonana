import { Connection } from '@solana/web3.js'
import { SOLANA_CONFIG } from './config'

// Создаем единое подключение к Solana
export const connection = new Connection(
  SOLANA_CONFIG.RPC_HOST,
  {
    commitment: 'confirmed',
    wsEndpoint: SOLANA_CONFIG.WS_ENDPOINT
  }
)

// Экспортируем функцию для получения подключения
export function getConnection(): Connection {
  return connection
}

// Helper to get network type
export const getNetwork = () => {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
}

// Helper to check if we're on mainnet
export const isMainnet = () => {
  return getNetwork() === 'mainnet-beta'
} 