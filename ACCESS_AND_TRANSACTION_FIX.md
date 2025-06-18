# Access Control and Transaction Fix - v1.0.0-beta.4

## Issues Fixed

### 1. Own Posts Showing as Locked in Feed
**Problem**: User's own posts appeared locked in feed until page refresh. After switching tabs/windows, posts would be locked again.

**Root Cause**: 
- `loadPosts` was called before `user` data was available
- When component mounted, `user` was `null`, so `userWallet` wasn't sent to API
- Posts loaded without proper access control information

**Solution**: Changed useEffect dependency from `[user]` to `[user?.wallet]`:
```typescript
useEffect(() => {
  loadPosts()
}, [user?.wallet]) // Reload when wallet changes
```

This ensures posts reload when wallet becomes available or changes.

### 2. Sellable Posts Transaction Timeout
**Problem**: Sellable posts transactions would timeout after 60 seconds despite correct price in Phantom wallet.

**Root Cause**: 
- Different connection instances between components
- SubscribeModal uses imported `connection` from `@/lib/solana/connection` 
- SellablePostModal was using `useConnection()` hook from wallet-adapter
- Different RPC configurations and timeout settings

**Solution**: 
1. Changed SellablePostModal to use same connection as SubscribeModal:
```typescript
// Before
import { useConnection } from '@solana/wallet-adapter-react'
const { connection } = useConnection()

// After  
import { connection } from '@/lib/solana/connection'
```

2. Added initial delay for transaction propagation:
```typescript
// Give transaction time to propagate through the network
await new Promise(resolve => setTimeout(resolve, 2000))
```

3. Improved transaction status checking:
```typescript
// If transaction not found yet, wait longer
if (!status.value && i < 20) {
  console.log(`Transaction not found yet, waiting... (attempt ${i + 1})`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  continue
}
```

4. Added connection health check before transaction:
```typescript
try {
  const slot = await connection.getSlot()
  console.log('Current slot:', slot)
} catch (err) {
  console.error('Connection error:', err)
  toast.error('Connection error. Please try again.')
  return
}
```

## Connection Configuration
The shared connection in `lib/solana/connection.ts` has:
- Primary RPC: QuickNode endpoint
- Fallback RPCs: Public Solana endpoints
- Timeout: 120 seconds
- Commitment: 'confirmed'
- Auto-retry on rate limit

## Testing
1. **Access Control**: Login and check your own posts appear unlocked immediately
2. **Sellable Posts**: Buy a sellable post and verify transaction confirms within reasonable time
3. **Connection**: Check console logs for connection status and transaction confirmation steps 