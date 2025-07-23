#!/bin/bash

echo "🚀 Запускаем создание Flash Sales на сервере..."

ssh root@fonana.me << 'ENDSSH'
cd /var/www/fonana

# Создаем временный скрипт на сервере
cat > /tmp/create-flash-sales.js << 'EOF'
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createFlashSales() {
  try {
    console.log('🚀 Создаем Flash Sales...\n')
    
    // Найдем всех создателей с платными постами
    const creators = await prisma.user.findMany({
      where: {
        isCreator: true,
        posts: {
          some: {
            isLocked: true,
            price: { gt: 0 }
          }
        }
      },
      include: {
        posts: {
          where: {
            isLocked: true,
            price: { gt: 0 }
          },
          take: 2
        }
      }
    })
    
    console.log(`Найдено создателей с платными постами: ${creators.length}`)
    
    for (const creator of creators) {
      console.log(`\n👤 Создатель: ${creator.nickname}`)
      
      // Flash Sale для Basic подписки
      const basicSale = await prisma.flashSale.create({
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
      console.log(`✅ Flash Sale Basic: ${basicSale.discount}% скидка`)
      
      // Flash Sale для Premium подписки
      const premiumSale = await prisma.flashSale.create({
        data: {
          creatorId: creator.id,
          discount: 30,
          subscriptionPlan: 'premium',
          startAt: new Date(),
          endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 дней
          isActive: true,
          maxRedemptions: 5,
          usedCount: 0
        }
      })
      console.log(`✅ Flash Sale Premium: ${premiumSale.discount}% скидка`)
      
      // Flash Sales для постов
      for (const post of creator.posts) {
        const postSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            postId: post.id,
            discount: 25,
            startAt: new Date(),
            endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 дня
            isActive: true,
            maxRedemptions: 20,
            usedCount: 0
          }
        })
        console.log(`✅ Flash Sale для поста "${post.title}": ${postSale.discount}% скидка`)
      }
    }
    
    const totalSales = await prisma.flashSale.count()
    console.log(`\n📊 Всего Flash Sales создано: ${totalSales}`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createFlashSales()
EOF

# Запускаем скрипт
node /tmp/create-flash-sales.js

# Удаляем временный файл
rm /tmp/create-flash-sales.js

echo "✅ Flash Sales созданы на сервере!"
ENDSSH 