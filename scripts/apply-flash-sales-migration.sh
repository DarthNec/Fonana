#!/bin/bash

# Применяем миграцию Flash Sales на production сервере

echo "🔄 Applying Flash Sales migration..."

# Сначала помечаем все старые миграции как примененные
echo "📝 Marking old migrations as applied..."
npx prisma migrate resolve --applied 20250613134109_init
npx prisma migrate resolve --applied 20250613195607_add_background_image
npx prisma migrate resolve --applied 20250613231238_add_creator_relation_to_subscription
npx prisma migrate resolve --applied 20250614192023_add_referral_system
npx prisma migrate resolve --applied 20250614220857_add_payment_system
npx prisma migrate resolve --applied 20250614221346_add_solana_wallet_and_auth_models
npx prisma migrate resolve --applied 20250614221549_update_user_for_nextauth
npx prisma migrate resolve --applied 20250614234239_add_post_purchases
npx prisma migrate resolve --applied 20250615045654_add_subscription_tiers
npx prisma migrate resolve --applied 20250617143114_add_user_settings
npx prisma migrate resolve --applied 20250617153716_add_creator_tier_settings
npx prisma migrate resolve --applied 20250617164105_add_notifications
npx prisma migrate resolve --applied 20250617202505_add_auction_system
npx prisma migrate resolve --applied 20250617230501_add_quantity_to_posts

# Теперь применяем новую миграцию
echo "🚀 Applying Flash Sales migration..."
npx prisma migrate deploy

# Генерируем Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "✅ Flash Sales migration applied successfully!" 