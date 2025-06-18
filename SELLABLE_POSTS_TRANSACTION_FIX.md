# Sellable Posts Transaction Fix - v1.0.0-beta.3

## Issues Fixed

### 1. Transaction Not Confirmed Error
**Problem**: Users were getting "Transaction not confirmed" error after approving transaction in Phantom wallet.

**Root Cause**: 
- SellablePostModal was only waiting 5 seconds after sending transaction
- Backend waited 60 seconds but transaction wasn't visible yet
- No proper confirmation check on frontend before sending to backend

**Solution**: Added proper transaction confirmation loop in SellablePostModal:
```tsx
// Wait for transaction confirmation
let confirmed = false
const maxRetries = 60

for (let i = 0; i < maxRetries; i++) {
  try {
    const status = await connection.getSignatureStatus(signature)
    
    if (status.value?.confirmationStatus === 'confirmed' || 
        status.value?.confirmationStatus === 'finalized') {
      confirmed = true
      break
    }
    
    if (status.value?.err) {
      throw new Error('Transaction failed on blockchain')
    }
    
    // If not confirmed yet, wait
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (error) {
    console.error('Error checking transaction status:', error)
    // Continue checking
  }
}

if (!confirmed) {
  throw new Error('Transaction not confirmed after 60 seconds')
}
```

### 2. Purchased Posts Still Showing as Locked
**Problem**: Even after purchasing sellable posts, they would still show with a lock icon and require page refresh to view content.

**Root Cause**: 
- API was not tracking sellable post purchases separately
- Access control logic didn't check if user had purchased a sellable post
- Only checked PostPurchase table (for paid posts) but not Post.soldToId (for sellable posts)

**Solution**: Updated API to track sellable purchases separately:
```typescript
// Get purchased sellable posts
const sellablePurchases = await prisma.post.findMany({
  where: {
    soldToId: currentUser.id,
    isSellable: true
  },
  select: { id: true }
})
userPurchasedSellablePosts = sellablePurchases.map((post: { id: string }) => post.id)
```

And updated access control logic:
```typescript
if (post.isLocked && !isCreatorPost) {
  // For sellable posts check purchase
  if (post.isSellable) {
    shouldHideContent = !hasPurchasedSellable
  }
  // ... other checks
}
```

## How It Works Now

### Sellable Post Purchase Flow:
1. User clicks buy on sellable post
2. SellablePostModal creates transaction and sends it
3. **NEW**: Frontend waits for blockchain confirmation (up to 60 seconds)
4. Only after confirmation, sends to backend API
5. Backend verifies transaction and updates database
6. Post is immediately accessible without page refresh

### Access Control:
- **Paid Posts**: Pay for access to content itself
- **Sellable Posts**: Pay for physical/digital goods, content access controlled separately
- Sellable posts can be:
  - Public (not locked)
  - Subscriber-only (locked, requires subscription)
  - Purchased (locked, but accessible if bought)

## Database Schema
- `Post.price`: Used for both paid posts and sellable posts
- `Post.isSellable`: Indicates if post is selling goods vs access
- `Post.soldToId`: Who bought the sellable post
- `PostPurchase`: Tracks paid post purchases (for content access)

## Testing
1. Create sellable post with lock enabled
2. Buy from another account
3. Content should be immediately accessible after purchase
4. No page refresh required 