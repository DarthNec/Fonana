# Price Field Unification - v1.0.0-beta.2

## Changes Made

### 1. Unified Price Field
- Removed separate `sellPrice` field for sellable posts
- Now using single `price` field for all post types that require payment:
  - Paid posts (pay for access to content)
  - Sellable posts with fixed price (pay for physical/digital goods)
- Sellable posts with auction type still use `auctionStartPrice` for starting bid

### 2. Component Updates

#### CreatePostModal.tsx
- Removed `sellPrice` from form state interface
- Updated price input for sellable posts to use `price` field
- Added validation to check `price` for both paid and sellable posts
- Added logic to reset price when switching from paid access type
- Currency field now applies to both paid and sellable posts

#### PostCard.tsx
- Already uses `price` field for display (no changes needed)

#### API Routes
- `/api/posts/route.ts`: Updated validation to check price for sellable posts
- `/api/posts/[id]/buy/route.ts`: Uses `price` field for purchase validation

#### Database
- `lib/db.ts`: Removed special handling of `sellPrice` field
- Schema already has only `price` field (no migration needed)

### 3. Version Update
- Updated footer version to **v1.0.0-beta.2**

## Testing Notes

1. **Paid Posts**: Create a post with "Paid" access type
   - Should require price input
   - Should save with specified price

2. **Sellable Posts**: Create a sellable post with "Fixed Price" type
   - Should use same price input field
   - Should save price in database
   - Should display price correctly in feed

3. **Price Reset**: When changing access type from "Paid" to others
   - Price should reset to 0

## Known Issues Fixed
- "null SOL" display for sellable posts
- "Please specify a price" error for paid posts
- Duplicate price fields causing confusion

## Database Impact
- No migration needed
- Uses existing `price` field in Post model
- Backwards compatible with existing posts 