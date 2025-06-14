import { PublicKey } from '@solana/web3.js'
import { connection } from './connection'
import { lamportsToSol } from './payments'

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
    const tx = await connection.getTransaction(signature, {
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
    
    for (let i = 1; i < accountKeys.staticAccountKeys.length; i++) {
      const diff = postBalances[i] - preBalances[i]
      if (diff > 0) {
        totalTransferred += lamportsToSol(diff)
        recipients.push(accountKeys.staticAccountKeys[i].toBase58())
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
    const allRecipientsValid = expectedRecipients.every(expected => 
      recipients.some(actual => actual === expected)
    )

    if (!allRecipientsValid) {
      return {
        isValid: false,
        error: 'Invalid recipients',
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
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
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

// Wait for transaction confirmation
export async function waitForConfirmation(
  signature: string,
  maxRetries: number = 30
): Promise<boolean> {
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      const status = await connection.getSignatureStatus(signature)
      
      if (status.value?.confirmationStatus === 'confirmed' || 
          status.value?.confirmationStatus === 'finalized') {
        return true
      }
      
      if (status.value?.err) {
        return false
      }
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000))
      retries++
    } catch (error) {
      console.error('Error checking transaction status:', error)
      retries++
    }
  }
  
  return false
} 