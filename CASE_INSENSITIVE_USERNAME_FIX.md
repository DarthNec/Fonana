# Case-Insensitive Username Fix & Referral System Update

## Date: January 6, 2025

## Issues Fixed

### 1. Case-Insensitive Username Handling
**Problem**: URLs like `fonana.me/Dogwater` were automatically lowercased by browsers to `fonana.me/dogwater`, causing "user not found" errors.

**Solution**: Implemented case-insensitive username lookup throughout the system:
- Updated `/api/user/route.ts` to use Prisma's `mode: 'insensitive'` for nickname searches
- Added validation to prevent SQL/NoSQL injections in username, ID, and wallet parameters
- Updated `lib/db.ts` functions `createOrUpdateUser` and `updateUserProfile` to check for duplicate nicknames case-insensitively

### 2. Duplicate Username Prevention
**Problem**: Users could register similar usernames with different cases (e.g., "Dogwater", "dogWater", "DOGWATER").

**Solution**: 
- Added case-insensitive uniqueness checks when creating or updating user profiles
- Validates nickname format (alphanumeric, underscore, dash only)
- Prevents registration of usernames that already exist in any case variation

### 3. Injection Protection
**Added validation for all user inputs**:
- Nickname: `/^[a-zA-Z0-9_-]+$/`
- User ID: `/^[a-zA-Z0-9]+$/`
- Wallet: `/^[a-zA-Z0-9]+$/`

### 4. Referral Link Format Update
**Changed from**: `fonana.me/r/username`
**Changed to**: `fonana.me/username`

**Updates made**:
- Updated `app/dashboard/referrals/page.tsx` to generate links without `/r/` prefix
- Updated `middleware.ts` to:
  - Redirect old `/r/username` links to `/username` (301 permanent redirect)
  - Handle referral tracking for both formats
  - Validate username format before setting referral cookie

## Technical Implementation

### API Changes (`app/api/user/route.ts`)
```typescript
// Case-insensitive search
user = await prisma.user.findFirst({
  where: { 
    nickname: {
      equals: nickname,
      mode: 'insensitive'
    }
  }
})
```

### Database Functions (`lib/db.ts`)
```typescript
// Check for existing nickname (case-insensitive)
const existingUserWithNickname = await prisma.user.findFirst({
  where: {
    nickname: {
      equals: data.nickname,
      mode: 'insensitive'
    }
  }
})
```

### Middleware Updates (`middleware.ts`)
```typescript
// Redirect old format
if (isReferralLink) {
  const username = pathname.substring(3)
  const newUrl = new URL(`/${username}`, request.url)
  return NextResponse.redirect(newUrl, { status: 301 })
}
```

## Testing
Created test script `scripts/test-case-insensitive.js` to verify:
- Case-insensitive username lookup works correctly
- Duplicate prevention across different cases
- All variations of a username resolve to the same user

## Deployment Notes
1. These changes are backward compatible
2. Old `/r/username` links will automatically redirect
3. Existing referral cookies continue to work
4. No database migration required (using Prisma's built-in case-insensitive mode)

## Files Modified
- `/app/api/user/route.ts` - Added case-insensitive search and validation
- `/lib/db.ts` - Updated user creation/update functions
- `/app/dashboard/referrals/page.tsx` - Changed referral link format
- `/middleware.ts` - Added redirect logic and improved referral handling
- `/scripts/test-case-insensitive.js` - Created test script (can be deleted after testing) 