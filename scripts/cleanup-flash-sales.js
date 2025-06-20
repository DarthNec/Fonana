import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupFlashSales() {
  try {
    console.log('🔍 Ищем Flash Sales пользователя yourdad...')
    
    // Находим пользователя yourdad
    const user = await prisma.user.findFirst({
      where: {
        nickname: 'yourdad'
      }
    })

    if (!user) {
      console.log('❌ Пользователь yourdad не найден')
      return
    }

    // Находим все Flash Sales этого пользователя
    const flashSales = await prisma.flashSale.findMany({
      where: {
        creatorId: user.id
      }
    })

    console.log(`📊 Найдено ${flashSales.length} Flash Sales`)

    if (flashSales.length > 0) {
      // Удаляем все Flash Sales
      const deleted = await prisma.flashSale.deleteMany({
        where: {
          creatorId: user.id
        }
      })

      console.log(`✅ Удалено ${deleted.count} Flash Sales`)
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupFlashSales() 