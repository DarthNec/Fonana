# Prisma Type Management Guide

## Overview
This document describes the standardized process for managing Prisma types and versions in the Fonana project.

## Current Setup

### Versions (as of December 28, 2024)
- **Prisma CLI**: 5.22.0 (fixed version)
- **@prisma/client**: 5.22.0 (fixed version)
- **Location**: Standard node_modules/@prisma/client

### Important Files
- `prisma/schema.prisma` - Database schema
- `lib/prisma.ts` - Prisma client singleton
- `lib/generated/prisma/` - Reference types (for documentation)

## Standard Process

### 1. Making Schema Changes
```bash
# Edit schema
vim prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name your_migration_name

# Generate types
npx prisma generate
```

### 2. Before Deployment
```bash
# Always regenerate types to ensure consistency
npx prisma generate

# Test build locally
npm run build

# If successful, commit changes
git add prisma/schema.prisma prisma/migrations
git commit -m "db: your migration description"
```

### 3. Deployment Process
```bash
# On production server
cd /var/www/fonana
git pull
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart fonana
```

## Key Rules

### ✅ DO:
1. **Keep versions synchronized** - Always use the same Prisma version on dev and prod
2. **Run `prisma generate` before build** - Ensures types are up to date
3. **Test locally first** - Always run `npm run build` before deploying
4. **Document schema changes** - Add comments in schema.prisma for complex relations

### ❌ DON'T:
1. **Don't use different Prisma versions** - This causes type mismatches
2. **Don't skip `prisma generate`** - Missing this step causes build failures
3. **Don't use `^` in version numbers** - Use exact versions (e.g., "5.22.0" not "^5.22.0")
4. **Don't generate types in custom directories** - Causes compatibility issues with adapters

## Troubleshooting

### Type Mismatch Errors
If you encounter type errors between dev and prod:
1. Check Prisma versions: `npm list prisma @prisma/client`
2. Ensure both environments use the same version
3. Run `npx prisma generate` on both environments
4. Clear node_modules and reinstall if needed

### Many-to-Many Relation Issues
Some Prisma versions handle many-to-many relations differently:
- Local: May generate `participants` field
- Production: May use junction table `_UserConversations`
- Solution: Use raw SQL queries for complex many-to-many operations (see conversations API)

### Build Failures
If build fails with Prisma type errors:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Run `npx prisma generate`
4. Try building again

## Version History
- **December 28, 2024**: Standardized on Prisma 5.22.0
- Fixed version numbers in package.json
- Documented type generation process 