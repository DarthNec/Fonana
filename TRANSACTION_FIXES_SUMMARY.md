# Transaction Fixes Summary
*Date: June 18, 2025*

## Problems Fixed

### 1. Sellable Post Purchase Error: "Simulation failed: AccountNotFound"
**Root Cause**: The SellablePostModal was not validating the creator's Solana wallet address before creating the transaction.

**Solution**: Added `isValidSolanaAddress` validation (same as used in SubscribeModal which works correctly).

**Fixed Code**:
```typescript
// Added import
import { isValidSolanaAddress } from '@/lib/solana/config'

// Added validation
if (!isValidSolanaAddress(creatorWallet)) {
  throw new Error(`Invalid creator wallet address: ${creatorWallet}`)
}
```

### 2. Paid Post Creation Error: "Please specify a price"
**Root Cause**: The API was not validating that paid posts have a price specified.

**Solution**: Added price validation in two places:
1. API route (`/api/posts/route.ts`)
2. Database function (`lib/db.ts`)

**Fixed Code**:
```typescript
// API validation
if (body.accessType === 'paid' && (!body.price || body.price <= 0)) {
  return NextResponse.json({ error: 'Please specify a price' }, { status: 400 })
}

// Database validation
if (data.tier === 'paid' && (!data.price || data.price <= 0)) {
  throw new Error('Price is required for paid posts')
}
```

## Testing

1. **Sellable Post Purchase**: Try buying a post from user with wallet `DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG`
2. **Paid Post Creation**: Create a new post with "Paid" access type and verify price field is required

## Status
✅ Deployed to production
✅ All changes are live 