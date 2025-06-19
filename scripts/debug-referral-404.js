const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugReferral404() {
  console.log('=== Отладка проблемы с @404 в реферальной системе ===\n')

  try {
    // 1. Проверяем существует ли пользователь dogwater
    console.log('1. Проверка пользователя dogwater:')
    const dogwater = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: 'dogwater',
          mode: 'insensitive'
        }
      }
    })
    
    if (dogwater) {
      console.log('✅ Пользователь найден:')
      console.log(`   ID: ${dogwater.id}`)
      console.log(`   Nickname: ${dogwater.nickname}`)
      console.log(`   Full Name: ${dogwater.fullName || 'не указано'}`)
      console.log(`   Wallet: ${dogwater.wallet}`)
    } else {
      console.log('❌ Пользователь dogwater НЕ найден!')
    }

    // 2. Проверяем существует ли пользователь с nickname "404"
    console.log('\n2. Проверка пользователя с nickname "404":')
    const user404 = await prisma.user.findFirst({
      where: {
        nickname: '404'
      }
    })
    
    if (user404) {
      console.log('⚠️  Найден пользователь с nickname "404":')
      console.log(`   ID: ${user404.id}`)
      console.log(`   Full Name: ${user404.fullName || 'не указано'}`)
      console.log(`   Wallet: ${user404.wallet}`)
      console.log('\n   ЭТО МОЖЕТ БЫТЬ ПРИЧИНОЙ ПРОБЛЕМЫ!')
    } else {
      console.log('✅ Пользователь с nickname "404" не найден')
    }

    // 3. Проверяем всех пользователей с похожими никнеймами
    console.log('\n3. Пользователи с никнеймами, содержащими "dog":')
    const dogUsers = await prisma.user.findMany({
      where: {
        nickname: {
          contains: 'dog',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        createdAt: true
      }
    })

    if (dogUsers.length > 0) {
      dogUsers.forEach(user => {
        console.log(`   - @${user.nickname} (${user.fullName || 'без имени'}) - создан ${user.createdAt.toLocaleDateString()}`)
      })
    } else {
      console.log('   Не найдено')
    }

    // 4. Проверяем последние созданные пользователи
    console.log('\n4. Последние 5 созданных пользователей:')
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        nickname: true,
        fullName: true,
        createdAt: true,
        referrer: {
          select: {
            nickname: true
          }
        }
      }
    })

    recentUsers.forEach(user => {
      const referrerInfo = user.referrer ? ` (реферер: @${user.referrer.nickname})` : ''
      console.log(`   - @${user.nickname} - ${user.createdAt.toLocaleDateString()}${referrerInfo}`)
    })

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugReferral404().catch(console.error) 