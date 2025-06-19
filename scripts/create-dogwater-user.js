const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createDogwaterUser() {
  console.log('=== Создание пользователя dogwater ===\n')

  try {
    // Проверяем, существует ли уже пользователь
    const existing = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: 'dogwater',
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      console.log('❌ Пользователь уже существует:')
      console.log(`   Nickname: ${existing.nickname}`)
      console.log(`   ID: ${existing.id}`)
      return
    }

    // Создаем нового пользователя
    const dogwater = await prisma.user.create({
      data: {
        nickname: 'dogwater',
        fullName: 'Dog Water',
        wallet: 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG', // Тот же wallet что и у Dogwater из админ-списка
        avatar: '/avatars/default-avatar.png',
        bio: 'Test user for referral system',
        isCreator: true,
        isVerified: true,
        followersCount: 0,
        postsCount: 0
      }
    })

    console.log('✅ Пользователь успешно создан:')
    console.log(`   ID: ${dogwater.id}`)
    console.log(`   Nickname: ${dogwater.nickname}`)
    console.log(`   Full Name: ${dogwater.fullName}`)
    console.log(`   Wallet: ${dogwater.wallet}`)
    console.log('\n🔗 Реферальная ссылка: https://fonana.me/dogwater')

  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createDogwaterUser().catch(console.error) 