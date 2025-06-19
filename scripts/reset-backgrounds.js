const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetBackgrounds() {
  try {
    console.log('🔄 Сбрасываю фоновые изображения у всех пользователей...')
    
    const result = await prisma.user.updateMany({
      where: {
        backgroundImage: {
          not: null
        }
      },
      data: {
        backgroundImage: null
      }
    })
    
    console.log(`✅ Сброшено фонов: ${result.count}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetBackgrounds() 