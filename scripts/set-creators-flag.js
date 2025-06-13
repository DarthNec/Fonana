const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setCreatorsFlag() {
  try {
    console.log('Устанавливаем флаг isCreator для всех пользователей...')
    
    // Обновляем всех пользователей
    const result = await prisma.user.updateMany({
      where: {
        isCreator: false
      },
      data: {
        isCreator: true
      }
    })
    
    console.log(`Обновлено ${result.count} пользователей`)
    
    // Показываем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        fullName: true,
        isCreator: true,
        _count: {
          select: {
            posts: true
          }
        }
      }
    })
    
    console.log('\nВсе пользователи:')
    users.forEach(user => {
      console.log(`- ${user.nickname || user.fullName || 'Безымянный'} (ID: ${user.id}) - isCreator: ${user.isCreator}, постов: ${user._count.posts}`)
    })
    
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setCreatorsFlag() 