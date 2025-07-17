#!/bin/bash

# Migration script from SQLite to PostgreSQL
# Usage: ./migrate-to-postgres.sh "postgresql://user:pass@host:5432/dbname"

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./migrate-to-postgres.sh \"postgresql://user:pass@host:5432/dbname\""
    echo "📝 Example: ./migrate-to-postgres.sh \"postgresql://fonana_user:password@localhost:5432/fonana\""
    exit 1
fi

POSTGRES_URL="$1"
echo "🚀 Starting migration from SQLite to PostgreSQL..."

# Update .env with new DATABASE_URL
echo "📝 Updating .env file..."
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$POSTGRES_URL\"|" .env

# Generate Prisma client for PostgreSQL
echo "🔄 Generating Prisma client..."
npx prisma generate

# Apply migrations to PostgreSQL
echo "🗄️ Applying database migrations..."
npx prisma migrate deploy || npx prisma db push

# Export data from SQLite
echo "📤 Exporting data from SQLite..."
npx prisma db pull --schema=prisma/schema.sqlite.prisma || true

# Create temporary script to export SQLite data
cat > migrate_data.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

// SQLite client
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

// PostgreSQL client  
const pgClient = new PrismaClient()

async function migrateData() {
  try {
    console.log('🔄 Starting data migration...')
    
    // Migrate Users
    console.log('👥 Migrating users...')
    const users = await sqliteClient.user.findMany()
    for (const user of users) {
      try {
        await pgClient.user.create({
          data: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image,
            nickname: user.nickname,
            fullName: user.fullName,
            bio: user.bio,
            avatar: user.avatar,
            backgroundImage: user.backgroundImage,
            website: user.website,
            twitter: user.twitter,
            telegram: user.telegram,
            location: user.location,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isVerified: user.isVerified,
            isCreator: user.isCreator,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            postsCount: user.postsCount,
            wallet: user.wallet,
            solanaWallet: user.solanaWallet,
            referrerId: user.referrerId
          }
        })
      } catch (e) {
        console.log(`⚠️ Skipping user ${user.nickname}: ${e.message}`)
      }
    }
    
    // Migrate Tags
    console.log('🏷️ Migrating tags...')
    const tags = await sqliteClient.tag.findMany()
    for (const tag of tags) {
      try {
        await pgClient.tag.create({
          data: {
            id: tag.id,
            name: tag.name,
            createdAt: tag.createdAt
          }
        })
      } catch (e) {
        console.log(`⚠️ Skipping tag ${tag.name}: ${e.message}`)
      }
    }
    
    // Migrate Posts
    console.log('📝 Migrating posts...')
    const posts = await sqliteClient.post.findMany()
    for (const post of posts) {
      try {
        await pgClient.post.create({
          data: {
            id: post.id,
            title: post.title,
            content: post.content,
            type: post.type,
            category: post.category,
            thumbnail: post.thumbnail,
            mediaUrl: post.mediaUrl,
            isLocked: post.isLocked,
            isPremium: post.isPremium,
            price: post.price,
            currency: post.currency,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            creatorId: post.creatorId,
            minSubscriptionTier: post.minSubscriptionTier,
            imageAspectRatio: post.imageAspectRatio,
            isSellable: post.isSellable,
            sellType: post.sellType,
            quantity: post.quantity,
            auctionStartPrice: post.auctionStartPrice,
            auctionStepPrice: post.auctionStepPrice,
            auctionDepositAmount: post.auctionDepositAmount,
            auctionStartAt: post.auctionStartAt,
            auctionEndAt: post.auctionEndAt,
            auctionStatus: post.auctionStatus
          }
        })
      } catch (e) {
        console.log(`⚠️ Skipping post ${post.title}: ${e.message}`)
      }
    }
    
    // Migrate other tables...
    console.log('📊 Migrating other data...')
    
    const follows = await sqliteClient.follow.findMany()
    for (const follow of follows) {
      try {
        await pgClient.follow.create({ data: follow })
      } catch (e) {
        console.log(`⚠️ Skipping follow: ${e.message}`)
      }
    }
    
    const likes = await sqliteClient.like.findMany()
    for (const like of likes) {
      try {
        await pgClient.like.create({ data: like })
      } catch (e) {
        console.log(`⚠️ Skipping like: ${e.message}`)
      }
    }
    
    const comments = await sqliteClient.comment.findMany()
    for (const comment of comments) {
      try {
        await pgClient.comment.create({ data: comment })
      } catch (e) {
        console.log(`⚠️ Skipping comment: ${e.message}`)
      }
    }
    
    const subscriptions = await sqliteClient.subscription.findMany()
    for (const subscription of subscriptions) {
      try {
        await pgClient.subscription.create({ data: subscription })
      } catch (e) {
        console.log(`⚠️ Skipping subscription: ${e.message}`)
      }
    }
    
    console.log('✅ Data migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await sqliteClient.$disconnect()
    await pgClient.$disconnect()
  }
}

migrateData()
EOF

# Run data migration
echo "🔄 Running data migration script..."
node migrate_data.js

# Clean up
rm -f migrate_data.js

echo ""
echo "✅ Migration completed!"
echo "🎉 Your Fonana project is now running on PostgreSQL!"
echo ""
echo "Next steps:"
echo "1. Test the application: npm run dev"
echo "2. Verify data in Prisma Studio: npx prisma studio"
echo "" 