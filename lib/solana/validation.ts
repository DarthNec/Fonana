import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getConnection } from './connection'

// Helper function to convert lamports to SOL
function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL
}

export interface TransactionValidation {
  isValid: boolean
  error?: string
  details?: {
    signature: string
    amount: number
    from: string
    to: string[]
    status: string
    confirmedAt?: Date
  }
}

export async function validateTransaction(
  signature: string,
  expectedAmount: number,
  expectedRecipients: string[]
): Promise<TransactionValidation> {
  try {
    // Get transaction details
    const tx = await getConnection().getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    })
    
    if (!tx || !tx.meta) {
      return {
        isValid: false,
        error: 'Transaction not found'
      }
    }

    // Check if transaction is successful
    if (tx.meta.err) {
      return {
        isValid: false,
        error: 'Transaction failed',
        details: {
          signature,
          amount: 0,
          from: '',
          to: [],
          status: 'failed'
        }
      }
    }

    // Get transaction details
    const accountKeys = tx.transaction.message.getAccountKeys()
    const fromPubkey = accountKeys.staticAccountKeys[0].toBase58()
    const preBalances = tx.meta.preBalances
    const postBalances = tx.meta.postBalances
    
    // Calculate total amount transferred
    let totalTransferred = 0
    const recipients: string[] = []
    const recipientAmounts: { [key: string]: number } = {}
    
    for (let i = 1; i < accountKeys.staticAccountKeys.length; i++) {
      const diff = postBalances[i] - preBalances[i]
      if (diff > 0) {
        const recipientKey = accountKeys.staticAccountKeys[i].toBase58()
        const amountInSol = lamportsToSol(diff)
        totalTransferred += amountInSol
        recipients.push(recipientKey)
        recipientAmounts[recipientKey] = amountInSol
      }
    }

    // Validate amount (with small tolerance for fees)
    const tolerance = 0.001 // 0.001 SOL tolerance
    if (Math.abs(totalTransferred - expectedAmount) > tolerance) {
      return {
        isValid: false,
        error: `Amount mismatch: expected ${expectedAmount}, got ${totalTransferred}`,
        details: {
          signature,
          amount: totalTransferred,
          from: fromPubkey,
          to: recipients,
          status: 'confirmed',
          confirmedAt: tx.blockTime ? new Date(tx.blockTime * 1000) : undefined
        }
      }
    }

    // Validate recipients
    const missingRecipients = expectedRecipients.filter(r => !recipients.includes(r))
    if (missingRecipients.length > 0) {
      return {
        isValid: false,
        error: `Missing expected recipients: ${missingRecipients.join(', ')}`,
        details: {
          signature,
          amount: totalTransferred,
          from: fromPubkey,
          to: recipients,
          status: 'confirmed',
          confirmedAt: tx.blockTime ? new Date(tx.blockTime * 1000) : undefined
        }
      }
    }

    return {
      isValid: true,
      details: {
        signature,
        amount: totalTransferred,
        from: fromPubkey,
        to: recipients,
        status: 'confirmed',
        confirmedAt: tx.blockTime ? new Date(tx.blockTime * 1000) : undefined
      }
    }
  } catch (error) {
    console.error('Transaction validation error:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

// Проверка распределения платежа
export async function validatePaymentDistribution(
  signature: string,
  distribution: {
    creatorWallet: string
    creatorAmount: number
    platformAmount: number
    referrerWallet?: string
    referrerAmount?: number
    totalAmount: number
  }
): Promise<TransactionValidation> {
  try {
    const expectedRecipients = [
      distribution.creatorWallet,
      process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'
    ]
    
    if (distribution.referrerWallet) {
      expectedRecipients.push(distribution.referrerWallet)
    }

    // Валидация базовой транзакции
    const validation = await validateTransaction(
      signature,
      distribution.totalAmount,
      expectedRecipients
    )

    if (!validation.isValid) {
      return validation
    }

    // Дополнительная проверка сумм по получателям
    const tx = await getConnection().getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    })

    if (!tx || !tx.meta) {
      return {
        isValid: false,
        error: 'Transaction not found for detailed validation'
      }
    }

    // Проверяем корректность распределения
    const accountKeys = tx.transaction.message.getAccountKeys()
    const preBalances = tx.meta.preBalances
    const postBalances = tx.meta.postBalances
    
    // Находим индексы получателей
    const creatorIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.toBase58() === distribution.creatorWallet
    )
    const platformIndex = accountKeys.staticAccountKeys.findIndex(
      key => key.toBase58() === (process.env.NEXT_PUBLIC_PLATFORM_WALLET || 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4')
    )

    // Проверяем суммы
    const tolerance = 0.0001 // Меньшая толерантность для точности
    
    if (creatorIndex >= 0) {
      const creatorReceived = lamportsToSol(postBalances[creatorIndex] - preBalances[creatorIndex])
      if (Math.abs(creatorReceived - distribution.creatorAmount) > tolerance) {
        return {
          isValid: false,
          error: `Creator amount mismatch: expected ${distribution.creatorAmount}, got ${creatorReceived}`
        }
      }
    }

    if (platformIndex >= 0) {
      const platformReceived = lamportsToSol(postBalances[platformIndex] - preBalances[platformIndex])
      if (Math.abs(platformReceived - distribution.platformAmount) > tolerance) {
        return {
          isValid: false,
          error: `Platform amount mismatch: expected ${distribution.platformAmount}, got ${platformReceived}`
        }
      }
    }

    if (distribution.referrerWallet && distribution.referrerAmount) {
      const referrerIndex = accountKeys.staticAccountKeys.findIndex(
        key => key.toBase58() === distribution.referrerWallet
      )
      
      if (referrerIndex >= 0) {
        const referrerReceived = lamportsToSol(postBalances[referrerIndex] - preBalances[referrerIndex])
        if (Math.abs(referrerReceived - distribution.referrerAmount) > tolerance) {
          return {
            isValid: false,
            error: `Referrer amount mismatch: expected ${distribution.referrerAmount}, got ${referrerReceived}`
          }
        }
      }
    }

    return validation
  } catch (error) {
    console.error('Payment distribution validation error:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Distribution validation failed'
    }
  }
}

// Вспомогательная функция для ожидания подтверждения транзакции
export async function waitForTransactionConfirmation(
  signature: string,
  maxRetries: number = 60, // Увеличено до 60 попыток
  retryDelay: number = 1000
): Promise<boolean> {
  console.log(`Waiting for transaction confirmation: ${signature}`)
  
  // Сначала проверяем статус транзакции напрямую
  // Не используем confirmTransaction так как для этого нужен blockhash
  
  // Получаем информацию о слоте для отладки
  try {
    const slot = await getConnection().getSlot()
    console.log(`Current slot: ${slot}`)
  } catch (err) {
    console.error('Error getting slot:', err)
  }
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await getConnection().getSignatureStatus(signature)
      
      console.log(`Attempt ${i + 1}/${maxRetries} - Status:`, {
        confirmationStatus: status.value?.confirmationStatus,
        err: status.value?.err,
        slot: status.context.slot,
        value: status.value
      })
      
      if (status.value?.confirmationStatus === 'confirmed' || 
          status.value?.confirmationStatus === 'finalized') {
        console.log(`Transaction confirmed after ${i + 1} attempts: ${signature}`)
        return true
      }
      
      if (status.value?.err) {
        console.error('Transaction failed:', status.value.err)
        return false
      }
      
      // Если транзакция еще не видна в сети, подождем немного больше
      if (!status.value) {
        if (i < 10) {
          console.log(`Transaction not found yet, waiting longer... (attempt ${i + 1})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay * 2))
          continue
        } else if (i === 10) {
          // После 10 попыток проверяем, не истекла ли транзакция
          console.log('Checking if transaction might have expired...')
          try {
            const tx = await getConnection().getTransaction(signature, {
              maxSupportedTransactionVersion: 0
            })
            if (!tx) {
              console.log('Transaction not found in blockchain, might have expired or never broadcasted')
            }
          } catch (err) {
            console.error('Error fetching transaction:', err)
          }
        }
      }
    } catch (error) {
      console.error(`Error checking transaction status (attempt ${i + 1}):`, error)
      
      // Если это временная ошибка сети, продолжаем попытки
      if (i < maxRetries - 1 && error instanceof Error && 
          (error.message.includes('fetch') || error.message.includes('network'))) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * 2))
        continue
      }
    }
    
    // Ждём перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }
  
  console.error(`Transaction not confirmed after ${maxRetries} attempts: ${signature}`)
  return false
}

// Check if a wallet address is valid
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
} 