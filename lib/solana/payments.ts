import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Connection
} from '@solana/web3.js'
import { getConnection } from './connection'
import { SOLANA_CONFIG } from './config'

// Получаем рекомендуемую приоритетную комиссию на основе текущей загрузки сети
async function getRecommendedPriorityFee(connection: Connection): Promise<number> {
  try {
    const fees = await connection.getRecentPrioritizationFees()
    if (fees && fees.length > 0) {
      const nonZeroFees = fees.filter(f => f.prioritizationFee > 0)
      if (nonZeroFees.length > 0) {
        const feeValues = nonZeroFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
        // Используем 90-й перцентиль для большей надежности в загруженной сети
        const p90 = feeValues[Math.floor(feeValues.length * 0.9)]
        // Минимум 600000, максимум 2000000 (увеличено в 2 раза для теста)
        return Math.min(Math.max(p90 || 600000, 600000), 2000000)
      }
    }
  } catch (error) {
    console.error('Error getting priority fees:', error)
  }
  // По умолчанию используем 600000 microlamports
  return 600000
}

// Проверяем существование аккаунта и возвращаем минимальную ренту если нужно
async function getAccountRentIfNeeded(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  try {
    const accountInfo = await connection.getAccountInfo(publicKey)
    if (!accountInfo) {
      // Аккаунт не существует, нужна рента для создания
      const minRent = await connection.getMinimumBalanceForRentExemption(0)
      console.log(`Account ${publicKey.toBase58()} doesn't exist, need ${minRent / LAMPORTS_PER_SOL} SOL for rent`)
      return minRent
    }
  } catch (error) {
    console.error('Error checking account:', error)
  }
  return 0
}

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
  console.log('Creating subscription transaction with:', {
    payerPublicKey: payerPublicKey.toBase58(),
    distribution
  })

  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  
  const transaction = new Transaction()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payerPublicKey
  ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
  
  // Получаем динамическую приоритетную комиссию
  const priorityFee = await getRecommendedPriorityFee(connection)
  console.log(`Using priority fee: ${priorityFee} microlamports`)
  
  // Добавляем приоритетную комиссию для более быстрого подтверждения
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee
    })
  )
  
  // Transfer to creator
  const creatorPubkey = new PublicKey(distribution.creatorWallet)
  
  // Проверяем, нужна ли рента для создания аккаунта создателя
  const creatorRent = await getAccountRentIfNeeded(connection, creatorPubkey)
  const creatorTransferAmount = Math.floor((distribution.creatorAmount + (creatorRent / LAMPORTS_PER_SOL)) * LAMPORTS_PER_SOL)
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: creatorPubkey,
      lamports: creatorTransferAmount
    })
  )

  // Transfer to platform
  const platformPubkey = new PublicKey(PLATFORM_WALLET)
  const platformTransferAmount = Math.floor(distribution.platformAmount * LAMPORTS_PER_SOL)
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: platformPubkey,
      lamports: platformTransferAmount
    })
  )

  // Transfer to referrer if exists
  if (distribution.referrerWallet && distribution.referrerAmount && distribution.referrerAmount > 0) {
    const referrerPubkey = new PublicKey(distribution.referrerWallet)
    
    // Проверяем, нужна ли рента для создания аккаунта реферера
    const referrerRent = await getAccountRentIfNeeded(connection, referrerPubkey)
    const referrerTransferAmount = Math.floor((distribution.referrerAmount + (referrerRent / LAMPORTS_PER_SOL)) * LAMPORTS_PER_SOL)
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        toPubkey: referrerPubkey,
        lamports: referrerTransferAmount
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
  console.log('Creating post purchase transaction with:', {
    payerPublicKey: payerPublicKey.toBase58(),
    distribution
  })
  
  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  
  const transaction = new Transaction()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payerPublicKey
  ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
  
  console.log('Transaction feePayer set to:', transaction.feePayer?.toBase58())
  
  // Получаем динамическую приоритетную комиссию
  const priorityFee = await getRecommendedPriorityFee(connection)
  console.log(`Using priority fee: ${priorityFee} microlamports`)
  
  // Добавляем приоритетную комиссию для более быстрого подтверждения
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee
    })
  )
  
  // Transfer to creator
  console.log('Adding transfer to creator:', {
    from: payerPublicKey.toBase58(),
    to: distribution.creatorWallet,
    amount: distribution.creatorAmount
  })
  
  const creatorPubkey = new PublicKey(distribution.creatorWallet)
  
  // Проверяем, нужна ли рента для создания аккаунта создателя
  const creatorRent = await getAccountRentIfNeeded(connection, creatorPubkey)
  const creatorTransferAmount = Math.floor((distribution.creatorAmount + (creatorRent / LAMPORTS_PER_SOL)) * LAMPORTS_PER_SOL)
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: creatorPubkey,
      lamports: creatorTransferAmount
    })
  )

  // Transfer to platform
  const platformPubkey = new PublicKey(PLATFORM_WALLET)
  const platformTransferAmount = Math.floor(distribution.platformAmount * LAMPORTS_PER_SOL)
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: platformPubkey,
      lamports: platformTransferAmount
    })
  )

  // Transfer to referrer if exists
  if (distribution.referrerWallet && distribution.referrerAmount && distribution.referrerAmount > 0) {
    console.log('Adding transfer to referrer:', {
      from: payerPublicKey.toBase58(),
      to: distribution.referrerWallet,
      amount: distribution.referrerAmount
    })
    
    const referrerPubkey = new PublicKey(distribution.referrerWallet)
    
    // Проверяем, нужна ли рента для создания аккаунта реферера
    const referrerRent = await getAccountRentIfNeeded(connection, referrerPubkey)
    const referrerTransferAmount = Math.floor((distribution.referrerAmount + (referrerRent / LAMPORTS_PER_SOL)) * LAMPORTS_PER_SOL)
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        toPubkey: referrerPubkey,
        lamports: referrerTransferAmount
      })
    )
  }
  
  console.log('Transaction created with feePayer:', transaction.feePayer.toBase58())
  
  return transaction
}

export async function createTipTransaction(
  payerPublicKey: PublicKey,
  creatorWallet: string,
  amount: number
): Promise<Transaction> {
  console.log('Creating tip transaction with:', {
    payerPublicKey: payerPublicKey.toBase58(),
    creatorWallet,
    amount
  })
  
  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  
  const transaction = new Transaction()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = payerPublicKey
  ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
  
  console.log('Transaction blockhash set to:', blockhash)
  console.log('Transaction lastValidBlockHeight:', lastValidBlockHeight)
  
  // Получаем динамическую приоритетную комиссию (как в работающих покупках)
  const priorityFee = await getRecommendedPriorityFee(connection)
  console.log(`Using priority fee: ${priorityFee} microlamports`)
  
  // Добавляем приоритетную комиссию для более быстрого подтверждения
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee
    })
  )
  
  const creatorPubkey = new PublicKey(creatorWallet)
  
  // Проверяем, нужна ли рента для создания аккаунта (как в работающих покупках)
  const creatorRent = await getAccountRentIfNeeded(connection, creatorPubkey)
  // Используем точно такую же формулу как в createPostPurchaseTransaction
  const transferAmount = Math.floor((amount + (creatorRent / LAMPORTS_PER_SOL)) * LAMPORTS_PER_SOL)
  
  console.log('Adding tip transfer:', {
    from: payerPublicKey.toBase58(),
    to: creatorWallet,
    amount: amount,
    amountInLamports: Math.floor(amount * LAMPORTS_PER_SOL),
    rentIfNeeded: creatorRent,
    rentInSOL: creatorRent / LAMPORTS_PER_SOL,
    totalLamports: transferAmount
  })
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: creatorPubkey,
      lamports: transferAmount
    })
  )
  
  console.log('Tip transaction created with:')
  console.log('- feePayer:', transaction.feePayer.toBase58())
  console.log('- instructions:', transaction.instructions.length)
  console.log('- signatures:', transaction.signatures.length)
  
  return transaction
} 