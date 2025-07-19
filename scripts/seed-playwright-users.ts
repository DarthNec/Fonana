import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fonana_user:fonana_pass@localhost:5432/fonana'
    }
  }
})

const PLAYWRIGHT_TEST_USERS = [
  {
    id: 'playwright_admin_user',
    wallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    nickname: 'playwright_admin',
    fullName: 'Playwright Admin User',
    isCreator: true,
    isVerified: true,
    bio: 'Automated test admin user for Playwright testing',
    solanaWallet: 'PLAYWRIGHT_ADMIN_WALLET_ADDRESS',
    followersCount: 100,
    followingCount: 50,
    postsCount: 25
  },
  {
    id: 'playwright_regular_user', 
    wallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS',
    nickname: 'playwright_user',
    fullName: 'Playwright Regular User',
    isCreator: false,
    isVerified: false,
    bio: 'Automated test user for Playwright testing',
    solanaWallet: 'PLAYWRIGHT_USER_WALLET_ADDRESS',
    followersCount: 10,
    followingCount: 25,
    postsCount: 0
  },
  {
    id: 'playwright_creator_user',
    wallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS', 
    nickname: 'playwright_creator',
    fullName: 'Playwright Creator User',
    isCreator: true,
    isVerified: true,
    bio: 'Automated test creator for Playwright testing',
    solanaWallet: 'PLAYWRIGHT_CREATOR_WALLET_ADDRESS',
    followersCount: 500,
    followingCount: 100,
    postsCount: 75
  }
]

export async function seedPlaywrightUsers() {
  // Only run in development/test environments
  if (process.env.NODE_ENV === 'production') {
    console.log('🚫 Playwright user seeding disabled in production')
    return
  }

  console.log('🌱 Seeding Playwright test users...')

  for (const userData of PLAYWRIGHT_TEST_USERS) {
    try {
      await prisma.user.upsert({
        where: { wallet: userData.wallet },
        update: userData,
        create: userData
      })
      console.log(`✅ Created/updated test user: ${userData.nickname}`)
    } catch (error) {
      console.error(`❌ Error creating user ${userData.nickname}:`, error)
    }
  }

  console.log('🎉 Playwright test users seeded successfully')
}

// Execute seeding
seedPlaywrightUsers()
  .then(() => {
    console.log('🏁 Seeding complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error seeding test users:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  }) 