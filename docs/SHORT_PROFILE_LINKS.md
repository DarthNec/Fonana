# Short Profile Links

This document describes the short profile links functionality in Fonana.

## Overview

Users can access profiles using short URLs based on their nicknames:
- Short URL: `https://fonana.me/username`
- Traditional URL: `https://fonana.me/creator/user-id`

## How It Works

1. **Dynamic Route**: The `app/[username]/page.tsx` handles all requests to `/{anything}`
2. **Nickname Lookup**: The page fetches user data by nickname via `/api/user?nickname={nickname}`
3. **Redirect**: If user found, redirects to `/creator/{userId}`
4. **404**: If no user found with that nickname, shows 404 page

## Implementation Details

### Frontend Components

- **getProfileLink()** utility in `lib/utils/links.ts` generates appropriate links:
  - If user has nickname: returns `/{nickname}`
  - Otherwise: returns `/creator/{id}`

### API Endpoint

- **GET /api/user** supports three query parameters:
  - `?wallet={address}` - find by wallet
  - `?id={userId}` - find by ID
  - `?nickname={nickname}` - find by nickname

### Components Using Short Links

- PostCard - creator links in post headers
- CreatorsExplorer - all creator profile links
- UserSubscriptions - subscription list links
- CreatorsFeed - featured creator cards

## Reserved Nicknames

The following nicknames are reserved and cannot be used:
- api, admin, dashboard, feed, create, creators
- profile, settings, analytics, test, category
- post, intimate, login, logout, signup, signin

## Testing

Run the test script to verify functionality:
```bash
node scripts/test-profile-links.js
```

## Migration

For existing users without nicknames:
```bash
node scripts/ensure-all-users-have-nicknames.js
```

This will generate nicknames from wallet addresses for users who don't have them. 