import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { 
  PublicKey, 
  Transaction, 
  SendOptions,
  Signer
} from '@solana/web3.js'
import type { 
  WalletName,
  Adapter 
} from '@solana/wallet-adapter-base'
import { update } from 'lodash'
import { useAppStore } from '@/lib/store/appStore'
import { clear } from 'console'



interface WalletState {
  // Proxy state
  _adapter: any | null
  _isSSR: boolean
  
  // Mirrored wallet state
  publicKey: PublicKey | null
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  wallet: {
    adapter: Adapter
    readyState: string
  } | null
  
  // Actions
  setAdapter: (adapter: any) => void
  updateState: (updates: Partial<WalletState>) => void
  
  // Proxy methods
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendTransaction: (
    transaction: Transaction,
    connection: any,
    options?: SendOptions
  ) => Promise<string>
  signTransaction?: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
}

export const useWalletStore = create<WalletState>()(
  devtools(
    (set, get) => ({
      // Initial state (SSR-safe)
      _adapter: null,
      _isSSR: typeof window === 'undefined',
      publicKey: null,
      connected: false,
      connecting: false,
      disconnecting: false,
      wallet: null,
      
      // Actions
      setAdapter: (adapter) => {
        console.log('🎯 [WALLET STORE] setAdapter called:', {
          hasAdapter: !!adapter,
          adapterName: adapter?.name,
          adapterConnected: adapter?.connected,
          adapterPublicKey: adapter?.publicKey?.toBase58()
        })
        
        set({ 
          _adapter: adapter,
          _isSSR: false 
        })
        
        // Sync state from adapter
        if (adapter) {
          console.log('🎯 [WALLET STORE] Syncing state from adapter')
          set({
            publicKey: adapter.publicKey,
            connected: adapter.connected,
            connecting: adapter.connecting,
            disconnecting: adapter.disconnecting,
            wallet: adapter.wallet
          })
        }
      },
      
      updateState: (updates) => {
        console.log('🎯 [WALLET STORE] updateState called:', {
          connected: updates.connected,
          hasPublicKey: !!updates.publicKey,
          publicKey: updates.publicKey?.toBase58(),
          connecting: updates.connecting,
          disconnecting: updates.disconnecting
        })
        if(!updates.connected) {
          console.log('[WalletStore] updateState called: disconnect');
          localStorage.removeItem('fonana-app-store');
          localStorage.removeItem('fonana_jwt_token');
          localStorage.removeItem('fonana_user_wallet');
          localStorage.removeItem('user_subscriptions');
          localStorage.removeItem('user_likes');
          localStorage.removeItem('user_emotions');
          // const { clearUser, user } = useAppStore.getState();
          // clearUser();
        }

        set(updates)
      },
      
      // Proxy methods with SSR safety
      connect: async () => {
        console.log('[WalletStore] connect called');
        const { _adapter, _isSSR } = get()
        if (_isSSR || !_adapter) {
          console.warn('[WalletStore] Cannot connect during SSR or without adapter')
          return
        }
        return _adapter.connect()
      },
      
      disconnect: async () => {
        console.log('[WalletStore] disconnect called');
        const { _adapter, _isSSR } = get()
        if (_isSSR || !_adapter) return

        return _adapter.disconnect()
      },
      
      sendTransaction: async (transaction, connection, options) => {
        const { _adapter, _isSSR } = get()
        if (_isSSR || !_adapter) {
          throw new Error('Wallet not connected')
        }
        return _adapter.sendTransaction(transaction, connection, options)
      },
      
      // Optional methods
      signTransaction: undefined,
      signAllTransactions: undefined,
      signMessage: undefined
    }),
    {
      name: 'wallet-store'
    }
  )
) 