import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js'

const commitment: Commitment = 'confirmed'

export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet'),
  commitment
)

// Helper to get network type
export const getNetwork = () => {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
}

// Helper to check if we're on mainnet
export const isMainnet = () => {
  return getNetwork() === 'mainnet-beta'
} 