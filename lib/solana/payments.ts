import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Connection
} from '@solana/web3.js'
import { getConnection, getConnectionWithFallback } from './connection'
import { SOLANA_CONFIG } from './config'

// 🔥 НАДЕЖНОЕ ПОЛУЧЕНИЕ BLOCKHASH с повторными попытками
async function getReliableBlockhash(connection: Connection): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    try {
      const result = await connection.getLatestBlockhash('confirmed')
      console.log(`[getReliableBlockhash] Blockhash obtained on attempt ${attempts + 1}:`, result.blockhash.substring(0, 8) + '...')
      return result
    } catch (error: any) {
      attempts++
      console.error(`[getReliableBlockhash] Failed to get blockhash on attempt ${attempts}:`, error.message)
      
      // Если это 403 или rate limit, ждем дольше
      if (error?.message?.includes('403') || error?.message?.includes('rate limit')) {
        console.log(`[getReliableBlockhash] Rate limit detected, waiting longer...`)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts))
      } else {
        // Обычная ошибка - ждем меньше
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
      }
      
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to get blockhash after ${maxAttempts} attempts: ${error.message}`)
      }
    }
  }
  
  throw new Error('Failed to get blockhash after all attempts')
}

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
  // КРИТИЧЕСКАЯ ПРОВЕРКА: валидация totalAmount на NaN, Infinity, null
  const cleanTotalAmount = Number(totalAmount)
  if (!Number.isFinite(cleanTotalAmount) || isNaN(cleanTotalAmount) || cleanTotalAmount <= 0) {
    console.error('[calculatePaymentDistribution] Invalid totalAmount:', {
      totalAmount,
      cleanTotalAmount,
      type: typeof totalAmount,
      isNaN: isNaN(totalAmount),
      isFinite: Number.isFinite(totalAmount)
    })
    throw new Error(`Некорректная сумма платежа: ${totalAmount}. Сумма должна быть положительным числом.`)
  }
  
  // Проверка минимальной суммы
  if (cleanTotalAmount < SOLANA_CONFIG.MIN_PAYMENT_AMOUNT) {
    throw new Error(`Минимальная сумма платежа: ${SOLANA_CONFIG.MIN_PAYMENT_AMOUNT} SOL`)
  }

  const platformFeePercent = hasReferrer ? FEES.PLATFORM_WITH_REFERRER : FEES.PLATFORM_NO_REFERRER
  const referrerFeePercent = hasReferrer ? FEES.REFERRER : 0
  const creatorPercent = 1 - platformFeePercent - referrerFeePercent

  return {
    creatorWallet,
    creatorAmount: cleanTotalAmount * creatorPercent,
    platformAmount: cleanTotalAmount * platformFeePercent,
    referrerWallet: hasReferrer ? referrerWallet : undefined,
    referrerAmount: hasReferrer ? cleanTotalAmount * referrerFeePercent : undefined,
    totalAmount: cleanTotalAmount
  }
}

export async function createSubscriptionTransaction(
  payerPublicKey: PublicKey,
  distribution: PaymentDistribution
): Promise<Transaction> {
  // 🔥 КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что payerPublicKey это объект PublicKey
  if (!payerPublicKey || typeof payerPublicKey.toBase58 !== 'function') {
    console.error('🔥 CRITICAL ERROR: payerPublicKey is not a valid PublicKey object:', {
      payerPublicKey,
      type: typeof payerPublicKey,
      hasToBase58: typeof payerPublicKey?.toBase58,
      constructor: payerPublicKey?.constructor?.name
    })
    throw new Error('Invalid payerPublicKey: must be a PublicKey object')
  }
  
  console.log('Creating subscription transaction with:', {
    payerPublicKey: payerPublicKey.toBase58(),
    distribution
  })

  const connection = await getConnectionWithFallback()
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
  return `${(Number(amount) || 0).toFixed(4)} SOL`
}

export async function createPostPurchaseTransaction(
  payerPublicKey: PublicKey,
  distribution: PaymentDistribution
): Promise<Transaction> {
  // 🔥 КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что payerPublicKey это объект PublicKey
  if (!payerPublicKey || typeof payerPublicKey.toBase58 !== 'function') {
    console.error('🔥 CRITICAL ERROR: payerPublicKey is not a valid PublicKey object:', {
      payerPublicKey,
      type: typeof payerPublicKey,
      hasToBase58: typeof payerPublicKey?.toBase58,
      constructor: payerPublicKey?.constructor?.name
    })
    throw new Error('Invalid payerPublicKey: must be a PublicKey object')
  }
  
  console.log('Creating post purchase transaction with:', {
    payerPublicKey: payerPublicKey.toBase58(),
    distribution
  })
  
  const connection = await getConnectionWithFallback()
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
  const creatorAmountToTransfer = distribution.creatorAmount + (creatorRent / LAMPORTS_PER_SOL)
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что сумма валидна перед конвертацией в lamports
  if (!Number.isFinite(creatorAmountToTransfer) || isNaN(creatorAmountToTransfer) || creatorAmountToTransfer < 0) {
    console.error('[createPostPurchaseTransaction] Invalid creatorAmountToTransfer:', {
      creatorAmount: distribution.creatorAmount,
      creatorRent,
      creatorAmountToTransfer,
      distribution
    })
    throw new Error(`Некорректная сумма для перевода создателю: ${creatorAmountToTransfer}`)
  }
  
  const creatorTransferAmount = Math.floor(creatorAmountToTransfer * LAMPORTS_PER_SOL)
  
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payerPublicKey,
      toPubkey: creatorPubkey,
      lamports: creatorTransferAmount
    })
  )

  // Transfer to platform
  const platformPubkey = new PublicKey(PLATFORM_WALLET)
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что сумма для платформы валидна
  if (!Number.isFinite(distribution.platformAmount) || isNaN(distribution.platformAmount) || distribution.platformAmount < 0) {
    console.error('[createPostPurchaseTransaction] Invalid platformAmount:', {
      platformAmount: distribution.platformAmount,
      distribution
    })
    throw new Error(`Некорректная сумма для платформы: ${distribution.platformAmount}`)
  }
  
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
    const referrerAmountToTransfer = distribution.referrerAmount! + (referrerRent / LAMPORTS_PER_SOL)
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что сумма для реферера валидна
    if (!Number.isFinite(referrerAmountToTransfer) || isNaN(referrerAmountToTransfer) || referrerAmountToTransfer < 0) {
      console.error('[createPostPurchaseTransaction] Invalid referrerAmountToTransfer:', {
        referrerAmount: distribution.referrerAmount,
        referrerRent,
        referrerAmountToTransfer,
        distribution
      })
      throw new Error(`Некорректная сумма для реферера: ${referrerAmountToTransfer}`)
    }
    
    const referrerTransferAmount = Math.floor(referrerAmountToTransfer * LAMPORTS_PER_SOL)
    
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
  
  const connection = await getConnectionWithFallback()
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
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: валидация amount на NaN перед операциями
  const cleanAmount = Number(amount)
  if (!Number.isFinite(cleanAmount) || isNaN(cleanAmount) || cleanAmount <= 0) {
    console.error('[createTipTransaction] Invalid amount:', {
      amount,
      cleanAmount,
      type: typeof amount
    })
    throw new Error(`Некорректная сумма чаевых: ${amount}`)
  }
  
  // Проверяем, нужна ли рента для создания аккаунта (как в работающих покупках)
  const creatorRent = await getAccountRentIfNeeded(connection, creatorPubkey)
  const tipAmountToTransfer = cleanAmount + (creatorRent / LAMPORTS_PER_SOL)
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что сумма валидна перед конвертацией в lamports
  if (!Number.isFinite(tipAmountToTransfer) || isNaN(tipAmountToTransfer) || tipAmountToTransfer < 0) {
    console.error('[createTipTransaction] Invalid tipAmountToTransfer:', {
      cleanAmount,
      creatorRent,
      tipAmountToTransfer
    })
    throw new Error(`Некорректная сумма для перевода чаевых: ${tipAmountToTransfer}`)
  }
  
  // Используем точно такую же формулу как в createPostPurchaseTransaction
  const transferAmount = Math.floor(tipAmountToTransfer * LAMPORTS_PER_SOL)
  
  console.log('Adding tip transfer:', {
    from: payerPublicKey.toBase58(),
    to: creatorWallet,
    amount: cleanAmount,
    amountInLamports: Math.floor(cleanAmount * LAMPORTS_PER_SOL),
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