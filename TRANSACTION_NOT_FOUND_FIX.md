# Transaction Not Found Fix
*Date: June 18, 2025*

## Problem
When buying sellable posts, transactions were failing with:
1. "Simulation failed: AccountNotFound" warning
2. Transaction successfully sent to blockchain
3. API returns 400 error "Transaction not found"

## Root Causes

### 1. Missing Transaction Confirmation Wait
The API was trying to validate the transaction immediately after receiving it, without waiting for blockchain confirmation.

### 2. Preflight Simulation Issues  
Transaction simulation was failing with "AccountNotFound" for new/unfunded creator accounts.

### 3. Creator Wallet Validation
No validation of creator wallet existence before attempting transaction.

## Solutions Implemented

### 1. Added Transaction Confirmation Wait (`/api/posts/[id]/buy`)
```typescript
// Wait for transaction confirmation
const isConfirmed = await waitForTransactionConfirmation(txSignature, 60, 2000)
if (!isConfirmed) {
  return NextResponse.json(
    { error: 'Transaction not confirmed. Please check your wallet and try again.' },
    { status: 400 }
  )
}
```

### 2. Skip Preflight Simulation (`SellablePostModal.tsx`)
```typescript
const sendOptions = {
  skipPreflight: true, // Skip preflight simulation to avoid AccountNotFound errors
  preflightCommitment: 'confirmed' as any,
  maxRetries: 3
}
```

### 3. Validate Creator Wallet
```typescript
const creatorWallet = post.creator.wallet || post.creator.solanaWallet
if (!creatorWallet) {
  return NextResponse.json(
    { error: 'Creator wallet not configured' },
    { status: 400 }
  )
}
```

### 4. Increased Confirmation Wait Time
Increased client-side wait time from 8s to 15s before calling API:
```typescript
await new Promise(resolve => setTimeout(resolve, 15000)) // 15 seconds instead of 8
```

## Testing
1. Try buying a sellable post - should work without "Transaction not found" error
2. Check console logs for proper validation messages
3. Verify transaction appears in blockchain explorer

## Status
✅ Deployed to production
✅ All changes are live on https://fonana.me 