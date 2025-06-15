import { Connection } from '@solana/web3.js'
import { SOLANA_CONFIG } from './config'

// Создаем единое подключение к Solana с QuickNode
export const connection = new Connection(
  SOLANA_CONFIG.RPC_HOST || 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // 60 секунд для подтверждения
    wsEndpoint: SOLANA_CONFIG.WS_ENDPOINT
  }
)

// Экспортируем функцию для получения подключения
export function getConnection(): Connection {
  return connection
}

// Helper to get network type
export function getNetworkUrl(): string {
  return SOLANA_CONFIG.RPC_HOST
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