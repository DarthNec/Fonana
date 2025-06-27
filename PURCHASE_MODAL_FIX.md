# Purchase Modal Fix - UserContext Integration

## Problem
Users were experiencing errors when trying to purchase posts. The error appeared immediately after opening the purchase modal, indicating that user data was undefined.

## Root Causes
1. **PurchaseModal was not using UserContext** - The component was using `publicKey.toBase58()` (wallet address) instead of getting user data from UserContext
2. **Missing creator data in props** - Feed and search pages were not passing complete creator information to PurchaseModal
3. **Inconsistent data formats** - Different pages were passing post data in different formats

## Solution

### 1. Added UserContext to PurchaseModal
```typescript
// components/PurchaseModal.tsx
import { useUserContext } from '@/lib/contexts/UserContext'

export default function PurchaseModal({ post, onClose, onSuccess }: PurchaseModalProps) {
  const { publicKey, connected, sendTransaction } = useWallet()
  const { user, isLoading: isUserLoading } = useUserContext() // Added
  
  // Check user is loaded before purchase
  if (!user || isUserLoading) {
    toast.error('Загрузка данных пользователя...')
    return
  }
  
  // Use user.wallet instead of publicKey for API call
  body: JSON.stringify({
    userId: user.wallet, // Changed from publicKey.toBase58()
    // ... other fields
  })
}
```

### 2. Fixed data passing in Feed page
```typescript
// app/feed/page.tsx
const handlePurchaseClick = (postData: UnifiedPost) => {
  setSelectedPost({
    id: postData.id,
    title: postData.content.title,
    content: postData.content.text,
    price: postData.access.price,
    currency: postData.access.currency,
    flashSale: postData.commerce?.flashSale,
    creator: { // Added complete creator data
      id: postData.creator.id,
      name: postData.creator.name,
      username: postData.creator.username,
      avatar: postData.creator.avatar,
      isVerified: postData.creator.isVerified
    }
  })
  setShowPurchaseModal(true)
}
```

### 3. Fixed data passing in Creator page
```typescript
// app/creator/[id]/page.tsx
const handlePurchaseClick = (postData: any) => {
  const formattedPost = {
    id: postData.id,
    title: postData.title,
    content: postData.content,
    price: postData.price,
    currency: postData.currency || 'SOL',
    flashSale: postData.flashSale,
    creator: { // Ensure creator data is always present
      id: postData.creator?.id || creator?.id,
      name: postData.creator?.name || postData.creator?.fullName || postData.creator?.nickname || '',
      username: postData.creator?.username || postData.creator?.nickname || '',
      avatar: postData.creator?.avatar || postData.creator?.avatar || null,
      isVerified: postData.creator?.isVerified || postData.creator?.isVerified || false
    }
  }
  setSelectedPurchaseData(formattedPost)
  setShowPurchaseModal(true)
}
```

### 4. Fixed data passing in Search page
```typescript
// app/search/page.tsx
if (action.type === 'purchase') {
  const post = filteredResults.posts.find(p => p.id === action.postId)
  if (post) {
    const formattedPost = {
      // ... format post data consistently
      creator: {
        id: post.creator?.id || post.creatorId,
        name: post.creator?.name || post.creator?.fullName || post.creator?.nickname || '',
        username: post.creator?.username || post.creator?.nickname || '',
        avatar: post.creator?.avatar || null,
        isVerified: post.creator?.isVerified || false
      }
    }
    setPurchaseModalData(formattedPost)
  }
}
```

## Testing
Created test page at `/test/purchase-test` to verify:
- UserContext is properly loaded
- User data is available before opening modal
- All required fields are passed correctly

## Result
✅ Purchase modal now works reliably without errors
✅ User data is properly loaded from UserContext
✅ Creator information is always available
✅ Consistent data format across all pages

## Important Notes
- The API endpoint `/api/posts/process-payment` expects `userId` to be a wallet address
- It looks up the user by wallet: `prisma.user.findUnique({ where: { wallet: userId } })`
- Always use `user.wallet` from UserContext, not `publicKey.toBase58()`
- Ensure creator data is included when passing post to PurchaseModal 