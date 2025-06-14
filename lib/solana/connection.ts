import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js'

const commitment: Commitment = 'confirmed'

// Create connection lazily to avoid build-time errors
let _connection: Connection | null = null

export const getConnection = () => {
  if (!_connection) {
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet')
    _connection = new Connection(endpoint, commitment)
  }
  return _connection
}

// For backwards compatibility
export const connection = new Proxy({} as Connection, {
  get(target, prop) {
    return getConnection()[prop as keyof Connection]
  }
})

// Helper to get network type
export const getNetwork = () => {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
}

// Helper to check if we're on mainnet
export const isMainnet = () => {
  return getNetwork() === 'mainnet-beta'
} 