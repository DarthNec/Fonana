const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDogwaterCapital() {
  console.log('=== Проверка пользователя Dogwater (с большой буквы) ===\n')

  try {
    // Ищем всех пользователей с вариациями dogwater
    const variations = ['dogwater', 'Dogwater', 'DogWater', 'DOGWATER']
    
    for (const variant of variations) {
      const user = await prisma.user.findUnique({
        where: { nickname: variant }
      })
      
      if (user) {
        console.log(`✅ Найден пользователь с nickname "${variant}":`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Full Name: ${user.fullName || 'не указано'}`)
        console.log(`   Wallet: ${user.wallet}`)
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}`)
        console.log('')
      }
    }

    // Также проверим case-insensitive поиск
    console.log('\nCase-insensitive поиск "dogwater":')
    const dogwaterUser = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: 'dogwater',
          mode: 'insensitive'
        }
      }
    })

    if (dogwaterUser) {
      console.log(`✅ Найден пользователь:`)
      console.log(`   Точный nickname: "${dogwaterUser.nickname}"`)
      console.log(`   ID: ${dogwaterUser.id}`)
      console.log(`   Full Name: ${dogwaterUser.fullName || 'не указано'}`)
    } else {
      console.log('❌ Пользователь не найден даже с case-insensitive поиском')
    }

    // Проверим последних пользователей с рефералами
    console.log('\n\nПоследние пользователи с рефералами:')
    const usersWithReferrers = await prisma.user.findMany({
      where: {
        referrerId: { not: null }
      },
      include: {
        referrer: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    usersWithReferrers.forEach(user => {
      console.log(`   @${user.nickname} <- пригласил @${user.referrer?.nickname}`)
    })

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDogwaterCapital().catch(console.error) 