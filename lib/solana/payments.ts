import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js'
import { getConnection } from './connection'
import { SOLANA_CONFIG } from './config'

export interface PaymentDistribution {
  creatorWallet: string
  creatorAmount: number
  platformAmount: number
  referrerWallet?: string
  referrerAmount?: number
  totalAmount: number
}

// Platform wallet from config
export const PLATFORM_WALLET = SOLANA_CONFIG.PLATFORM_WALLET

// Fee percentages
export const FEES = {
  PLATFORM_WITH_REFERRER: 0.05,  // 5% when there's a referrer
  PLATFORM_NO_REFERRER: 0.10,    // 10% when no referrer
  REFERRER: 0.05,                 // 5% for referrer
  CREATOR_WITH_REFERRER: 0.90,   // 90% when there's a referrer
  CREATOR_NO_REFERRER: 0.90      // 90% when no referrer
}

export function calculatePaymentDistribution(
  totalAmount: number,
  creatorWallet: string,
  hasReferrer: boolean,
  referrerWallet?: string
): PaymentDistribution {
  // Проверка минимальной суммы
  if (totalAmount < SOLANA_CONFIG.MIN_PAYMENT_AMOUNT) {
    throw new Error(`Минимальная сумма платежа: ${SOLANA_CONFIG.MIN_PAYMENT_AMOUNT} SOL`)
  }

  const platformFeePercent = hasReferrer ? FEES.PLATFORM_WITH_REFERRER : FEES.PLATFORM_NO_REFERRER
  const referrerFeePercent = hasReferrer ? FEES.REFERRER : 0
  const creatorPercent = 1 - platformFeePercent - referrerFeePercent

  return {
    creatorWallet,
    creatorAmount: totalAmount * creatorPercent,
    platformAmount: totalAmount * platformFeePercent,
    referrerWallet: hasReferrer ? referrerWallet : undefined,
    referrerAmount: hasReferrer ? totalAmount * referrerFeePercent : undefined,
    totalAmount
  }
}

export async function createSubscriptionTransaction(
  payerPublicKey: PublicKey,
  distribution: PaymentDistribution
): Promise<Transaction> {
  const transaction = new Transaction()
  
  // Get recent blockhash with retry
  let blockhash
  try {
    const result = await getConnection().getLatestBlockhash('confirmed')
    blockhash = result.blockhash
  } catch (error) {
    console.error('Error getting blockhash:', error)
    throw new Error('Не удалось получить данные блокчейна. Попробуйте позже.')
  }
  
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payerPublicKey
  
  // Transfer to creator
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: new PublicKey(distribution.creatorWallet),
      lamports: Math.floor(distribution.creatorAmount * LAMPORTS_PER_SOL)
    })
  )
  
  // Transfer platform fee
  const platformWallet = new PublicKey(PLATFORM_WALLET)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: platformWallet,
      lamports: Math.floor(distribution.platformAmount * LAMPORTS_PER_SOL)
    })
  )
  
  // Transfer referrer fee if applicable
  if (distribution.referrerWallet && distribution.referrerAmount) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        toPubkey: new PublicKey(distribution.referrerWallet),
        lamports: Math.floor(distribution.referrerAmount * LAMPORTS_PER_SOL)
      })
    )
  }
  
  return transaction
}

// Helper function to convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

// Format SOL amount for display
export function formatSolAmount(amount: number): string {
  return `${amount.toFixed(4)} SOL`
}

export async function createPostPurchaseTransaction(
  payerPublicKey: PublicKey,
  distribution: PaymentDistribution
): Promise<Transaction> {
  const transaction = new Transaction()
  
  // Get recent blockhash with retry
  let blockhash
  try {
    const result = await getConnection().getLatestBlockhash('confirmed')
    blockhash = result.blockhash
  } catch (error) {
    console.error('Error getting blockhash:', error)
    throw new Error('Не удалось получить данные блокчейна. Попробуйте позже.')
  }
  
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payerPublicKey
  
  // Transfer to creator
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: new PublicKey(distribution.creatorWallet),
      lamports: Math.floor(distribution.creatorAmount * LAMPORTS_PER_SOL)
    })
  )
  
  // Transfer platform fee
  const platformWallet = new PublicKey(PLATFORM_WALLET)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: platformWallet,
      lamports: Math.floor(distribution.platformAmount * LAMPORTS_PER_SOL)
    })
  )
  
  // Transfer referrer fee if applicable
  if (distribution.referrerWallet && distribution.referrerAmount) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        toPubkey: new PublicKey(distribution.referrerWallet),
        lamports: Math.floor(distribution.referrerAmount * LAMPORTS_PER_SOL)
      })
    )
  }
  
  return transaction
} 