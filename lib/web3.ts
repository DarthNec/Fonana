import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

// Solana connection
export const solanaConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com',
  'confirmed'
)

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL
}

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return sol * LAMPORTS_PER_SOL
}

// Format wallet address for display
export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

// Check if string is valid Solana address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Get SOL balance for wallet
export async function getSolBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await solanaConnection.getBalance(publicKey)
    return lamportsToSol(balance)
  } catch (error) {
    console.error('Error getting SOL balance:', error)
    return 0
  }
}

// Price conversion utilities
export const CRYPTO_PRICES = {
  SOL: 98.50, // USD price (should be fetched from API)
  USDC: 1.00,
  ETH: 2340.00
} as const

export function convertToUSD(amount: number, currency: keyof typeof CRYPTO_PRICES): number {
  return amount * CRYPTO_PRICES[currency]
}

export function convertFromUSD(usdAmount: number, currency: keyof typeof CRYPTO_PRICES): number {
  return usdAmount / CRYPTO_PRICES[currency]
}

// Subscription period utilities
export const SUBSCRIPTION_PERIODS = {
  '1': { months: 1, label: '1 месяц' },
  '3': { months: 3, label: '3 месяца' },
  '6': { months: 6, label: '6 месяцев' },
  '12': { months: 12, label: '12 месяцев' }
} as const

export function calculateSubscriptionEndDate(months: number): Date {
  const now = new Date()
  now.setMonth(now.getMonth() + months)
  return now
} 