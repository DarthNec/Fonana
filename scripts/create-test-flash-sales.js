const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestFlashSales() {
  try {
    console.log('🚀 Создаем тестовые Flash Sales...\n')
    
    // Найдем создателя artcreator
    const creator = await prisma.user.findFirst({
      where: {
        nickname: 'artcreator'
      },
      include: {
        posts: {
          where: {
            isLocked: true,
            price: { gt: 0 }
          },
          take: 3
        }
      }
    })
    
    if (!creator) {
      console.error('❌ Пользователь artcreator не найден')
      return
    }
    
    console.log(`👤 Создатель найден: ${creator.nickname} (${creator.wallet})`)
    console.log(`📝 Найдено платных постов: ${creator.posts.length}`)
    
    // 1. Flash Sale для подписки Basic
    const subscriptionSale = await prisma.flashSale.create({
      data: {
        creatorId: creator.id,
        discount: 50,
        subscriptionPlan: 'basic',
        startAt: new Date(),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
        isActive: true,
        maxRedemptions: 10,
        usedCount: 0
      }
    })
    
    console.log(`\n✅ Создана Flash Sale для подписки Basic:`)
    console.log(`   ID: ${subscriptionSale.id}`)
    console.log(`   Скидка: ${subscriptionSale.discount}%`)
    console.log(`   Действует до: ${subscriptionSale.endAt.toLocaleString()}`)
    
    // 2. Flash Sale для подписки Premium
    const premiumSale = await prisma.flashSale.create({
      data: {
        creatorId: creator.id,
        discount: 30,
        subscriptionPlan: 'premium',
        startAt: new Date(),
        endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 дня
        isActive: true,
        maxRedemptions: 5,
        usedCount: 0
      }
    })
    
    console.log(`\n✅ Создана Flash Sale для подписки Premium:`)
    console.log(`   ID: ${premiumSale.id}`)
    console.log(`   Скидка: ${premiumSale.discount}%`)
    console.log(`   Действует до: ${premiumSale.endAt.toLocaleString()}`)
    
    // 3. Flash Sales для постов
    if (creator.posts.length > 0) {
      for (const post of creator.posts) {
        const postSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            postId: post.id,
            discount: 25,
            startAt: new Date(),
            endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 дня
            isActive: true,
            maxRedemptions: 20,
            usedCount: 0
          }
        })
        
        console.log(`\n✅ Создана Flash Sale для поста "${post.title}":`)
        console.log(`   ID: ${postSale.id}`)
        console.log(`   Скидка: ${postSale.discount}%`)
        console.log(`   Оригинальная цена: ${post.price} SOL`)
        console.log(`   Цена со скидкой: ${(post.price * 0.75).toFixed(3)} SOL`)
      }
    } else {
      // Если нет платных постов, создадим Flash Sale для первого попавшегося поста
      const anyPost = await prisma.post.findFirst({
        where: {
          creatorId: creator.id
        }
      })
      
      if (anyPost) {
        // Обновим пост, чтобы он стал платным
        await prisma.post.update({
          where: { id: anyPost.id },
          data: { 
            isLocked: true,
            price: 0.1,
            currency: 'SOL'
          }
        })
        
        const postSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            postId: anyPost.id,
            discount: 40,
            startAt: new Date(),
            endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 дня
            isActive: true,
            maxRedemptions: 20,
            usedCount: 0
          }
        })
        
        console.log(`\n✅ Создана Flash Sale для поста "${anyPost.title}":`)
        console.log(`   ID: ${postSale.id}`)
        console.log(`   Скидка: ${postSale.discount}%`)
        console.log(`   Установлена цена: 0.1 SOL`)
        console.log(`   Цена со скидкой: ${(0.1 * 0.6).toFixed(3)} SOL`)
      }
    }
    
    // Проверяем результат
    const totalSales = await prisma.flashSale.count()
    console.log(`\n📊 Всего Flash Sales в базе: ${totalSales}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestFlashSales() 