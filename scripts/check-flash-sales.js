const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkFlashSales() {
  try {
    console.log('🔍 Проверяем Flash Sales в базе данных...\n')
    
    // Все Flash Sales
    const allFlashSales = await prisma.flashSale.findMany({
      include: {
        creator: {
          select: {
            nickname: true,
            wallet: true
          }
        },
        post: {
          select: {
            title: true,
            price: true
          }
        },
        redemptions: true
      }
    })
    
    console.log(`📊 Всего Flash Sales в базе: ${allFlashSales.length}`)
    console.log('================================\n')
    
    for (const sale of allFlashSales) {
      console.log(`🏷️  Flash Sale ID: ${sale.id}`)
      console.log(`👤 Создатель: ${sale.creator.nickname || sale.creator.wallet}`)
      console.log(`🎯 Тип: ${sale.post ? 'Пост' : 'Подписка'}`)
      
      if (sale.post) {
        console.log(`📝 Пост: "${sale.post.title}" (${sale.post.price} SOL)`)
      } else if (sale.subscriptionPlan) {
        console.log(`📦 План подписки: ${sale.subscriptionPlan}`)
      }
      
      console.log(`💰 Скидка: ${sale.discount}%`)
      console.log(`📅 Начало: ${sale.startAt.toLocaleString()}`)
      console.log(`📅 Конец: ${sale.endAt.toLocaleString()}`)
      console.log(`🔢 Макс. использований: ${sale.maxRedemptions || 'Неограниченно'}`)
      console.log(`✅ Использовано: ${sale.usedCount}`)
      console.log(`🟢 Активна: ${sale.isActive ? 'Да' : 'Нет'}`)
      
      const now = new Date()
      const isCurrentlyActive = sale.isActive && sale.startAt <= now && sale.endAt > now
      console.log(`⏰ Действует сейчас: ${isCurrentlyActive ? 'Да' : 'Нет'}`)
      
      if (isCurrentlyActive) {
        const timeLeft = Math.floor((sale.endAt.getTime() - now.getTime()) / 1000 / 60)
        console.log(`⏳ Осталось времени: ${timeLeft} минут`)
      }
      
      console.log('\n--------------------------------\n')
    }
    
    // Активные Flash Sales
    const activeFlashSales = allFlashSales.filter(sale => {
      const now = new Date()
      return sale.isActive && sale.startAt <= now && sale.endAt > now
    })
    
    console.log(`\n✅ Активных Flash Sales сейчас: ${activeFlashSales.length}`)
    
    // Flash Sales для подписок
    const subscriptionFlashSales = allFlashSales.filter(sale => sale.subscriptionPlan)
    console.log(`📦 Flash Sales для подписок: ${subscriptionFlashSales.length}`)
    
    // Flash Sales для постов
    const postFlashSales = allFlashSales.filter(sale => sale.postId)
    console.log(`📝 Flash Sales для постов: ${postFlashSales.length}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFlashSales() 