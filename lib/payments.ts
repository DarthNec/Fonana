'use client'

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'

// Solana connection with QuickNode mainnet RPC
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/',
  'confirmed'
)

// USDC mint address on mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Platform fee wallet (замените на реальный адрес)
const PLATFORM_FEE_WALLET = new PublicKey('11111111111111111111111111111112')

export interface PaymentParams {
  recipientAddress: string
  amount: number
  currency: 'SOL' | 'USDC'
  type: 'subscription' | 'donation' | 'content'
  comment?: string
}

export interface PaymentResult {
  success: boolean
  signature?: string
  error?: string
}

// Получить комиссию платформы
export function getPlatformFee(amount: number, type: string): number {
  switch (type) {
    case 'subscription': return amount * 0.1 // 10%
    case 'donation': return amount * 0.025 // 2.5%
    case 'content': return amount * 0.15 // 15%
    default: return 0
  }
}

// Создать транзакцию SOL
export async function createSOLTransaction(
  senderPublicKey: PublicKey,
  params: PaymentParams
): Promise<Transaction> {
  const { recipientAddress, amount, type } = params
  const recipient = new PublicKey(recipientAddress)
  
  const platformFee = getPlatformFee(amount, type)
  const recipientAmount = amount - platformFee
  
  const transaction = new Transaction()
  
  // Перевод получателю
  if (recipientAmount > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipient,
        lamports: Math.floor(recipientAmount * LAMPORTS_PER_SOL),
      })
    )
  }
  
  // Комиссия платформе
  if (platformFee > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: PLATFORM_FEE_WALLET,
        lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
      })
    )
  }
  
  // Получить последний blockhash
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = senderPublicKey
  
  return transaction
}

// Создать транзакцию USDC (упрощенная версия)
export async function createUSDCTransaction(
  senderPublicKey: PublicKey,
  params: PaymentParams
): Promise<Transaction> {
  const { recipientAddress, amount, type } = params
  const recipient = new PublicKey(recipientAddress)
  
  const platformFee = getPlatformFee(amount, type)
  const recipientAmount = amount - platformFee
  
  const transaction = new Transaction()
  
  try {
    // Получить associated token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      senderPublicKey
    )
    
    const recipientTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      recipient
    )
    
    const platformTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      PLATFORM_FEE_WALLET
    )
    
    // USDC использует 6 десятичных знаков
    const USDC_DECIMALS = 6
    
    // Перевод получателю
    if (recipientAmount > 0) {
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          senderPublicKey,
          Math.floor(recipientAmount * Math.pow(10, USDC_DECIMALS))
        )
      )
    }
    
    // Комиссия платформе
    if (platformFee > 0) {
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          platformTokenAccount,
          senderPublicKey,
          Math.floor(platformFee * Math.pow(10, USDC_DECIMALS))
        )
      )
    }
    
    // Получить последний blockhash
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = senderPublicKey
    
    return transaction
  } catch (error) {
    console.error('Error creating USDC transaction:', error)
    throw new Error('Не удалось создать USDC транзакцию')
  }
}

// Выполнить платеж
export async function executePayment(
  params: PaymentParams,
  sendTransaction: any,
  publicKey: PublicKey
): Promise<PaymentResult> {
  try {
    let transaction: Transaction
    
    if (params.currency === 'SOL') {
      transaction = await createSOLTransaction(publicKey, params)
    } else if (params.currency === 'USDC') {
      transaction = await createUSDCTransaction(publicKey, params)
    } else {
      throw new Error(`Неподдерживаемая валюта: ${params.currency}`)
    }
    
    // Отправить транзакцию
    const signature = await sendTransaction(transaction, connection)
    
    // Подтвердить транзакцию
    await connection.confirmTransaction(signature, 'confirmed')
    
    return {
      success: true,
      signature
    }
  } catch (error) {
    console.error('Payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}

// Проверить баланс SOL
export async function getSOLBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error)
    return 0
  }
}

// Проверить баланс USDC
export async function getUSDCBalance(publicKey: PublicKey): Promise<number> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey)
    const balance = await connection.getTokenAccountBalance(tokenAccount)
    return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals)
  } catch (error) {
    console.error('Error getting USDC balance:', error)
    return 0
  }
}

// Создать QR код для Solana Pay
export function createSolanaPayURL(params: PaymentParams): string {
  const { recipientAddress, amount, currency } = params
  const totalAmount = amount + getPlatformFee(amount, params.type)
  
  const url = new URL('solana:')
  url.searchParams.set('recipient', recipientAddress)
  url.searchParams.set('amount', totalAmount.toString())
  
  if (currency === 'USDC') {
    url.searchParams.set('spl-token', USDC_MINT.toString())
  }
  
  if (params.comment) {
    url.searchParams.set('memo', params.comment)
  }
  
  return url.toString()
} 