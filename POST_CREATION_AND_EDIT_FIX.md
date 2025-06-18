# Post Creation and Edit Fix - v1.0.0-beta.5

## Issues Fixed

### 1. Create Post Modal Required Price for Non-Sellable Posts
**Problem**: When creating posts with access types like "free", "subscribers", etc. (non-sellable), modal showed error "Please specify a price".

**Root Cause**: 
```typescript
// Before
if (formData.sellType === 'FIXED_PRICE' && (!formData.price || formData.price <= 0)) {
  toast.error('Please specify a price')
  return
}
```
This validation checked `sellType` without first checking if post is sellable.

**Solution**: Added check for `isSellable`:
```typescript
// After
if (formData.isSellable && formData.sellType === 'FIXED_PRICE' && (!formData.price || formData.price <= 0)) {
  toast.error('Please specify a price')
  return
}
```

### 2. Post Price Became Null After Editing
**Problem**: When editing posts, existing price would become null after saving.

**Root Causes**:
1. EditPostModal didn't load price for sellable posts with non-paid access types
2. EditPostModal only sent price for 'paid' access type posts
3. API backend reset price to null for all non-paid access types

**Solutions**:

#### EditPostModal Data Loading:
```typescript
// Now loads price for all posts including sellable
if (post.price && post.price > 0) {
  setPrice(post.price.toString())
}
```

#### EditPostModal Data Saving:
```typescript
// Preserve price for sellable posts
price: (accessType === 'paid' || (post.isSellable && price)) ? parseFloat(price) : null,
isSellable: post.isSellable || false,
sellType: post.sellType || null,
quantity: post.quantity || null
```

#### API Backend Fix:
```typescript
// Don't reset price if it's a sellable post
case 'free':
  dataToUpdate.minSubscriptionTier = null
  dataToUpdate.isLocked = false
  if (!updateData.isSellable) {
    dataToUpdate.price = null
  }
  break
```

## Post Types and Price Handling

### Regular Posts:
- **Free**: No price
- **Subscribers/Premium/VIP**: No price, access by subscription tier
- **Paid**: Has price, pay for content access

### Sellable Posts (can be combined with any access type):
- **Free + Sellable**: Public content, but pay for physical/digital goods
- **Subscribers + Sellable**: Content for subscribers, goods for purchase
- **Premium/VIP + Sellable**: Content for tier, goods for purchase
- **Paid + Sellable**: Pay for content access AND goods

## Testing
1. Create a sellable post with "Free" access - should not require price for content
2. Edit a sellable post - price should be preserved
3. Create non-sellable posts - should work without price
4. Edit posts with different combinations of access types and sellable status 