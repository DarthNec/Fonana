# Referral System Update Documentation

## Overview

The Fonana referral system has been updated with the following improvements:

### 1. Dashboard/Referrals Page
- **Translated to English**: All text is now in English
- **Updated Design**: Consistent with the site's modern design system
- **Fixed Layout**: Added `pt-20` for navbar offset
- **Updated URL Format**: Referral links now use `/r/username` format

### 2. Profile Page Loading Fix
- **Fixed infinite loading**: Added proper loading state management
- **Better error handling**: Shows 404 for non-existent users
- **Works for non-logged users**: Anyone can visit profile pages

### 3. Referral Cookie System
- **Cookie Duration**: 7 days
- **First visitor wins**: Only the first referrer is saved
- **Supports multiple formats**:
  - Direct profile: `fonana.app/username`
  - Referral link: `fonana.app/r/username`
  - Both set the same cookie

### 4. Commission Distribution
The system correctly distributes commissions:

**Without referrer:**
- Creator: 90%
- Platform: 10%

**With referrer:**
- Creator: 90%
- Platform: 5%
- Referrer: 5%

## Technical Details

### Middleware Updates
```typescript
// Supports both /username and /r/username
const isReferralLink = pathname.match(/^\/r\/[a-zA-Z0-9_-]+$/)
const isProfileVisit = pathname.match(/^\/[a-zA-Z0-9_-]+$/) && !pathname.startsWith('/api') // etc...

// Only sets cookie if no existing referrer
if (!existingReferrer && referrer) {
  response.cookies.set('fonana_referrer', referrer, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
}
```

### API Integration
The referrer is tracked in:
- `/api/user` - When creating new users
- `/api/subscriptions/process-payment` - For subscription payments
- `/api/posts/process-payment` - For post purchases
- `/api/user/referral-earnings` - For tracking earnings

## Testing Checklist

1. **Referral Link Setting**:
   - [ ] Visit `fonana.app/r/username` - should redirect to profile and set cookie
   - [ ] Visit `fonana.app/username` - should show profile and set cookie
   - [ ] Cookie persists for 7 days
   - [ ] First referrer wins (subsequent visits don't override)

2. **Profile Page**:
   - [ ] Works for logged-in users
   - [ ] Works for non-logged users
   - [ ] Shows 404 for non-existent users
   - [ ] No infinite loading

3. **Dashboard/Referrals**:
   - [ ] All text in English
   - [ ] Proper navbar offset
   - [ ] Modern design consistent with site
   - [ ] Referral link copies correctly
   - [ ] Statistics load properly

4. **Commission Distribution**:
   - [ ] Subscriptions with referrer: 90/5/5 split
   - [ ] Subscriptions without referrer: 90/10 split
   - [ ] Post purchases with referrer: 90/5/5 split
   - [ ] Post purchases without referrer: 90/10 split

## Deployment Notes

All changes have been tested locally and are ready for production deployment. 