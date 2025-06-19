const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkBackgrounds() {
  try {
    // Получаем статистику по фонам
    const totalUsers = await prisma.user.count()
    const usersWithBackground = await prisma.user.count({
      where: {
        AND: [
          { backgroundImage: { not: null } },
          { backgroundImage: { not: '' } }
        ]
      }
    })
    const usersWithoutBackground = totalUsers - usersWithBackground
    
    console.log('📊 Статистика фоновых изображений:')
    console.log(`   Всего пользователей: ${totalUsers}`)
    console.log(`   С фоном: ${usersWithBackground}`)
    console.log(`   Без фона: ${usersWithoutBackground}`)
    console.log(`   Процент без фона: ${((usersWithoutBackground / totalUsers) * 100).toFixed(1)}%`)
    
    // Показываем несколько примеров пользователей без фона
    console.log('\n👥 Примеры пользователей без фона:')
    const examples = await prisma.user.findMany({
      where: {
        OR: [
          { backgroundImage: null },
          { backgroundImage: '' }
        ]
      },
      take: 10,
      select: {
        id: true,
        nickname: true,
        email: true,
        name: true,
        backgroundImage: true
      }
    })
    
    examples.forEach(user => {
      console.log(`   - ${user.nickname || user.name || user.email} (ID: ${user.id})`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBackgrounds() 