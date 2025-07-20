# 📋 SOLUTION PLAN: Hybrid Wallet-Zustand Migration

## 📅 Date: 2025-01-20
## 🎯 Version: 1.0 - Initial Plan

---

## 🎯 **ЦЕЛЬ РЕШЕНИЯ**

Создать SSR-safe wallet integration через Zustand proxy pattern, сохранив 100% функциональности wallet-adapter.

---

## 📝 **ПЛАН ИМПЛЕМЕНТАЦИИ**

### **PHASE 1: Core Infrastructure (30 минут)**

#### Step 1.1: Create Wallet Store
```typescript
// lib/store/walletStore.ts
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
        set({ 
          _adapter: adapter,
          _isSSR: false 
        })
        
        // Sync state from adapter
        if (adapter) {
          set({
            publicKey: adapter.publicKey,
            connected: adapter.connected,
            connecting: adapter.connecting,
            disconnecting: adapter.disconnecting,
            wallet: adapter.wallet
          })
        }
      },
      
      updateState: (updates) => set(updates),
      
      // Proxy methods with SSR safety
      connect: async () => {
        const { _adapter, _isSSR } = get()
        if (_isSSR || !_adapter) {
          console.warn('[WalletStore] Cannot connect during SSR or without adapter')
          return
        }
        return _adapter.connect()
      },
      
      disconnect: async () => {
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
```

#### Step 1.2: Create SSR-Safe Hook
```typescript
// lib/hooks/useSafeWallet.ts
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
```

#### Step 1.3: Create Wallet Sync Component
```typescript
// components/WalletStoreSync.tsx
'use client'

import { useEffect } from 'react'
import { useWallet as useOriginalWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store/walletStore'

/**
 * Syncs wallet-adapter state to Zustand store
 * Must be placed inside WalletProvider
 */
export function WalletStoreSync() {
  const walletAdapter = useOriginalWallet()
  const { setAdapter, updateState } = useWalletStore()
  
  // Initial sync
  useEffect(() => {
    setAdapter(walletAdapter)
  }, [walletAdapter, setAdapter])
  
  // State sync
  useEffect(() => {
    updateState({
      publicKey: walletAdapter.publicKey,
      connected: walletAdapter.connected,
      connecting: walletAdapter.connecting,
      disconnecting: walletAdapter.disconnecting,
      wallet: walletAdapter.wallet
    })
  }, [
    walletAdapter.publicKey,
    walletAdapter.connected,
    walletAdapter.connecting,
    walletAdapter.disconnecting,
    walletAdapter.wallet,
    updateState
  ])
  
  return null
}
```

---

### **PHASE 2: Connection Unification (20 минут)**

#### Step 2.1: Create Connection Service
```typescript
// lib/services/ConnectionService.ts
import { Connection, Commitment } from '@solana/web3.js'

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
```

#### Step 2.2: Update Connection Import
```typescript
// lib/solana/connection.ts
// Re-export from service for backward compatibility
export { connection, connectionService } from '@/lib/services/ConnectionService'
```

---

### **PHASE 3: Migration Implementation (1 час)**

#### Step 3.1: Update WalletProvider
```typescript
// components/WalletProvider.tsx - добавить в конец компонента
import { WalletStoreSync } from './WalletStoreSync'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // ... existing code ...
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        localStorageKey="fonanaWallet"
        onError={(error) => {
          console.error('Wallet error:', error)
        }}
      >
        <WalletModalProvider>
          <WalletStoreSync /> {/* ADD THIS */}
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
```

#### Step 3.2: Update AppProvider
```typescript
// lib/providers/AppProvider.tsx
import { useSafeWallet } from '@/lib/hooks/useSafeWallet'
// Заменить import { useWallet } from '@solana/wallet-adapter-react'

export function AppProvider({ children }: AppProviderProps) {
  const { publicKey, connected } = useSafeWallet() // CHANGED
  // ... rest of code stays the same
}
```

#### Step 3.3: Create Migration Script
```typescript
// scripts/migrate-wallet-imports.js
const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Patterns to replace
const replacements = [
  {
    from: "import { useWallet } from '@solana/wallet-adapter-react'",
    to: "import { useWallet } from '@/lib/hooks/useSafeWallet'"
  },
  {
    from: 'import { useConnection } from "@solana/wallet-adapter-react"',
    to: 'import { useConnection } from "@/lib/services/ConnectionService"'
  },
  {
    from: 'const { connection } = useConnection()',
    to: 'import { connection } from "@/lib/solana/connection"\n  // const { connection } = useConnection() - MIGRATED'
  }
]

// Find all TypeScript files
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'scripts/**']
})

let totalReplacements = 0

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  let modified = false
  
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(new RegExp(from, 'g'), to)
      modified = true
      totalReplacements++
      console.log(`✓ Updated ${file}`)
    }
  })
  
  if (modified) {
    fs.writeFileSync(file, content)
  }
})

console.log(`\n✅ Migration complete! ${totalReplacements} replacements made.`)
```

---

### **PHASE 4: Component Migration (30 минут)**

#### Step 4.1: Migration Priority List
```yaml
Priority 1 (Critical - SSR blocking):
- AppProvider.tsx ✓
- Navbar.tsx
- BottomNav.tsx
- HomePageClient.tsx

Priority 2 (Transaction components):
- PurchaseModal.tsx
- SubscribeModal.tsx
- SubscriptionPayment.tsx
- SellablePostModal.tsx

Priority 3 (Features):
- ConversationPage.tsx
- CreatePostModal.tsx
- CreateFlashSale.tsx
- MessagesPageClient.tsx

Priority 4 (UI/Utils):
- MobileWalletConnect.tsx
- WalletPersistenceProvider.tsx
- Avatar.tsx
- NotificationsDropdown.tsx
```

#### Step 4.2: Component Migration Template
```typescript
// BEFORE:
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'

export function MyComponent() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  // ...
}

// AFTER:
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { connection } from '@/lib/solana/connection'

export function MyComponent() {
  const { publicKey, sendTransaction } = useWallet()
  // connection imported directly
  // ...
}
```

---

### **PHASE 5: Testing & Validation (30 минут)**

#### Step 5.1: Test Checklist
```yaml
SSR Tests:
- [ ] npm run build succeeds
- [ ] .next/standalone/ created
- [ ] No useContext errors in build log
- [ ] Production start works

Functionality Tests:
- [ ] Wallet connection works
- [ ] Wallet disconnection works
- [ ] Transaction sending works
- [ ] Mobile wallet support works
- [ ] Auto-reconnect works
- [ ] JWT auth flow works
```

#### Step 5.2: Create Test Page
```typescript
// app/test/wallet-migration/page.tsx
'use client'

import { useWallet } from '@/lib/hooks/useSafeWallet'
import { connection } from '@/lib/solana/connection'
import { useState } from 'react'

export default function WalletMigrationTest() {
  const wallet = useWallet()
  const [testResults, setTestResults] = useState<string[]>([])
  
  const runTests = async () => {
    const results: string[] = []
    
    // Test 1: Wallet state
    results.push(`✓ Connected: ${wallet.connected}`)
    results.push(`✓ PublicKey: ${wallet.publicKey?.toBase58() || 'none'}`)
    
    // Test 2: Connection
    try {
      const slot = await connection.getSlot()
      results.push(`✓ Connection works: slot ${slot}`)
    } catch (e) {
      results.push(`✗ Connection failed: ${e}`)
    }
    
    // Test 3: SSR safety
    results.push(`✓ SSR Safe: ${typeof window === 'undefined' ? 'Yes' : 'Client'}`)
    
    setTestResults(results)
  }
  
  return (
    <div className="p-8">
      <h1>Wallet Migration Test</h1>
      <button onClick={runTests}>Run Tests</button>
      <pre>{testResults.join('\n')}</pre>
    </div>
  )
}
```

---

## 📊 **SUCCESS METRICS**

```yaml
Build Success:
- npm run build: ✅ No errors
- Standalone: ✅ Created
- SSR Errors: 0

Functionality:
- Wallet Connect: ✅ Works
- Transactions: ✅ Work
- Mobile: ✅ Supported
- Performance: Same as before

Code Quality:
- Type Safety: 100%
- No any types
- Backward compatible
```

---

## 🚀 **DEPLOYMENT PLAN**

1. **Local Testing** (10 min)
   - Run migration script
   - Test all functionality
   - Verify build

2. **Staging Deploy** (20 min)
   - Deploy to staging
   - Test transactions
   - Monitor errors

3. **Production Deploy** (10 min)
   - Deploy with rollback ready
   - Monitor for 30 min
   - Celebrate 🎉

---

## 🔄 **ROLLBACK PLAN**

If issues arise:
```bash
# 1. Revert imports
git checkout -- "*.tsx" "*.ts"

# 2. Remove new files
rm -rf lib/store/walletStore.ts
rm -rf lib/hooks/useSafeWallet.ts
rm -rf lib/services/ConnectionService.ts
rm -rf components/WalletStoreSync.tsx

# 3. Rebuild
npm run build
```

---

## ✅ **CHECKLIST BEFORE IMPLEMENTATION**

- [ ] Backup current code
- [ ] Review all 17 components using wallet
- [ ] Prepare rollback branch
- [ ] Clear .next cache
- [ ] Have staging environment ready
- [ ] Block 2-3 hours for implementation 