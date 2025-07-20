import { Connection, Commitment, PublicKey } from '@solana/web3.js'

class ConnectionService {
  private static instance: ConnectionService
  private connection: Connection
  
  private constructor() {
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
      'https://api.mainnet-beta.solana.com'
    
    this.connection = new Connection(endpoint, {
      commitment: 'confirmed' as Commitment,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_URL
    })
  }
  
  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService()
    }
    return ConnectionService.instance
  }
  
  getConnection(): Connection {
    return this.connection
  }
  
  // Convenience methods
  async getLatestBlockhash(commitment?: Commitment) {
    return this.connection.getLatestBlockhash(commitment || 'confirmed')
  }
  
  async confirmTransaction(signature: string, commitment?: Commitment) {
    return this.connection.confirmTransaction(signature, commitment || 'confirmed')
  }
  
  async getBalance(publicKey: PublicKey, commitment?: Commitment) {
    return this.connection.getBalance(publicKey, commitment || 'confirmed')
  }
}

// Export singleton instance
export const connectionService = ConnectionService.getInstance()

// Export connection for backward compatibility
export const connection = connectionService.getConnection()

// Export hook for components
export function useConnection() {
  return {
    connection: connectionService.getConnection()
  }
} 