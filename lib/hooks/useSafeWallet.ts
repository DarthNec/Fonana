import { useWalletStore } from '@/lib/store/walletStore'
import type { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * SSR-safe replacement for useWallet()
 * Returns same interface as @solana/wallet-adapter-react
 */
export function useSafeWallet(): WalletContextState {
  const store = useWalletStore()
  
  // Return store state that matches WalletContextState interface
  return {
    publicKey: store.publicKey,
    connected: store.connected,
    connecting: store.connecting,
    disconnecting: store.disconnecting,
    wallet: store.wallet,
    wallets: [], // Will be populated by adapter sync
    select: () => {}, // Will be implemented in Phase 2
    connect: store.connect,
    disconnect: store.disconnect,
    sendTransaction: store.sendTransaction,
    signTransaction: store.signTransaction,
    signAllTransactions: store.signAllTransactions,
    signMessage: store.signMessage,
    signIn: undefined, // Not used in project
    autoConnect: false
  } as WalletContextState
}

// Alias for easier migration
export const useWallet = useSafeWallet 