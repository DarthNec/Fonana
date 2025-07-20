# 🏗️ ARCHITECTURE CONTEXT: Current Wallet Integration

## 📅 Date: 2025-01-20
## 🎯 Scope: Wallet-Adapter Integration Analysis

---

## 🔄 **ТЕКУЩИЙ ПОТОК ДАННЫХ**

```mermaid
graph TD
    A[User Action] --> B[Component]
    B --> C{useWallet Hook}
    C --> D[WalletContext]
    D --> E[@solana/wallet-adapter-react]
    E --> F[Wallet Extension/App]
    F --> G[Transaction Signed]
    G --> H[Blockchain]
    
    B --> I{useConnection}
    I --> J[ConnectionContext]
    J --> K[RPC Endpoint]
    
    D -.->|SSR FAILS HERE| L[Server Render]
```

---

## 📦 **КОМПОНЕНТЫ И ЗАВИСИМОСТИ**

### 1. **Provider Hierarchy**
```typescript
// components/ClientShell.tsx - текущий порядок:
<ThemeProvider>
  <ErrorBoundary>
    <WalletProvider>              // @solana/wallet-adapter-react
      <WalletPersistenceProvider> // custom persistence
        <AppProvider>             // Zustand + business logic
          {children}
```

### 2. **Wallet Provider Details**
```typescript
// components/WalletProvider.tsx
- Использует: ConnectionProvider, WalletProvider, WalletModalProvider
- Wallets: [PhantomWalletAdapter()] // остальные auto-detected
- autoConnect: true
- localStorageKey: "fonanaWallet"
- SSR Guard: есть, но недостаточный
```

### 3. **App Provider Integration**
```typescript
// lib/providers/AppProvider.tsx
export function AppProvider({ children }) {
  const { publicKey, connected } = useWallet() // ← ПРОБЛЕМА!
  
  // JWT auth при подключении
  useEffect(() => {
    if (connected && publicKey) {
      createJWTToken(publicKey.toBase58())
    }
  }, [connected, publicKey])
}
```

### 4. **Component Usage Map**

#### **Critical Components (транзакции)**
```typescript
1. PurchaseModal.tsx
   - sendTransaction для покупки постов
   - Retry logic (3 attempts)
   - Fresh blockhash pattern
   
2. SubscribeModal.tsx  
   - sendTransaction для подписок
   - Flash sale calculations
   - Complex state management
   
3. ConversationPage.tsx
   - Tips functionality
   - Message purchases
   - Real-time updates
```

#### **UI Components**
```typescript
1. Navbar.tsx
   - Wallet connection status
   - User avatar from API
   - Mobile wallet support
   
2. BottomNav.tsx
   - Disconnect functionality
   - Profile menu state
   - Navigation guards
```

#### **Service Components**
```typescript
1. MobileWalletConnect.tsx
   - Phantom deeplinks
   - Mobile detection
   - Toast notifications
   
2. WalletPersistenceProvider.tsx
   - localStorage persistence
   - Auto-reconnect logic
   - Cache management
```

---

## 🔌 **ТОЧКИ ИНТЕГРАЦИИ**

### 1. **Wallet Functions Used**
```javascript
// Анализ использования из 17+ компонентов:
useWallet() {
  publicKey,      // 17 places - wallet address
  connected,      // 17 places - connection state  
  sendTransaction,// 11 places - payment flows
  disconnect,     // 3 places  - logout
  wallet,         // 2 places  - wallet metadata
  connecting,     // 1 place   - loading state
}
```

### 2. **Connection Patterns**
```javascript
// КОНФЛИКТ: 2 источника connection
// lib/solana/connection.ts
export const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
})

// vs useConnection() hook
const { connection } = useConnection()
```

### 3. **Transaction Patterns**
```javascript
// Общий паттерн во всех компонентах:
1. Check wallet connected
2. Build transaction
3. Get fresh blockhash
4. sendTransaction()
5. Wait confirmation (2-60 sec)
6. Handle retry logic
7. Update UI state
```

---

## 🏛️ **АРХИТЕКТУРНЫЕ ПАТТЕРНЫ**

### 1. **State Management Mix**
```
Zustand (SSR-safe):
├── User state
├── Notifications
├── Posts/Creators
└── UI state

React Context (SSR issues):
├── WalletContext (@solana)
├── ConnectionContext (@solana)
├── ThemeContext
└── PricingContext
```

### 2. **Authentication Flow**
```
1. User connects wallet
2. AppProvider detects connection
3. Creates JWT token
4. Stores in localStorage + httpOnly cookie
5. All API calls use JWT
6. Wallet only needed for transactions
```

### 3. **Error Handling Patterns**
```javascript
// Transaction errors handled locally:
- User rejection → toast.error('Cancelled')
- Insufficient funds → specific message
- Network errors → retry logic
- Timeout → increased wait + retry
```

---

## 🔗 **ВНЕШНИЕ ЗАВИСИМОСТИ**

### 1. **NPM Packages**
```json
"@solana/wallet-adapter-base": "^0.9.23",
"@solana/wallet-adapter-react": "^0.15.35",
"@solana/wallet-adapter-react-ui": "^0.9.35", 
"@solana/wallet-adapter-wallets": "^0.19.32",
"@solana/web3.js": "^1.87.6",
```

### 2. **Wallet Apps Supported**
- Phantom (primary)
- Solflare
- Backpack
- Others via Wallet Standard

### 3. **RPC Endpoints**
```javascript
// Production
NEXT_PUBLIC_SOLANA_RPC_URL=https://...quiknode.pro/...

// Fallback
clusterApiUrl('mainnet-beta')
```

---

## 🚨 **КРИТИЧЕСКИЕ СВЯЗИ**

### 1. **AppProvider → useWallet**
```javascript
// БЛОКЕР: AppProvider требует wallet context
// Невозможно инициализировать без wallet
// JWT auth зависит от publicKey
```

### 2. **Transaction Components → sendTransaction**
```javascript
// 11 компонентов напрямую вызывают sendTransaction
// Каждый имеет свою retry logic
// Нет централизованной обработки
```

### 3. **Mobile Support → WalletModal**
```javascript
// WalletModalProvider тесно интегрирован
// Custom UI сложно реализовать
// Deeplinks требуют специальной логики
```

---

## 📊 **СТАТИСТИКА ИСПОЛЬЗОВАНИЯ**

```yaml
Total Files Using Wallet: 17
Direct useWallet calls: 47
sendTransaction calls: 23
Connection imports: 11
Wallet UI components: 5
Custom wallet logic: 3
```

---

## ✅ **ВЫВОДЫ ДЛЯ МИГРАЦИИ**

### Что можно мигрировать легко:
1. **publicKey, connected** - простые getters
2. **disconnect** - простая функция
3. **Connection** - можно унифицировать

### Что требует внимания:
1. **sendTransaction** - сложная логика с retry
2. **WalletModal** - UI компоненты
3. **Mobile support** - deeplinks и detection

### Что нельзя трогать:
1. **Wallet-adapter core** - оставляем как есть
2. **Transaction signing** - проксируем через store
3. **Wallet detection** - используем adapter

---

## 🎯 **АРХИТЕКТУРНОЕ РЕШЕНИЕ**

Гибридный подход с Zustand Proxy Store:
- Zustand управляет state (SSR-safe)
- Wallet-adapter остается для функциональности
- Proxy pattern для безопасной миграции
- Progressive enhancement возможна 