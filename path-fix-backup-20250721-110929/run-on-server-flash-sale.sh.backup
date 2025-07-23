#!/bin/bash

echo "🚀 Создаем Flash Sales на продакшн сервере..."

# Используем правильный порт SSH
ssh -p 43988 root@69.10.59.234 << 'ENDSSH'
cd /var/www/fonana

echo "📍 Текущая директория: $(pwd)"

# Создаем скрипт в директории проекта
cat > scripts/temp-create-flash-sales.js << 'EOF'
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createFlashSales() {
  try {
    console.log('🚀 Создаем Flash Sales на продакшне...\n')
    
    // Удаляем старые Flash Sales для очистки
    const deleted = await prisma.flashSale.deleteMany({})
    console.log(`🗑️  Удалено старых Flash Sales: ${deleted.count}`)
    
    // Найдем создателей для Flash Sales
    const creators = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: 'yourdad' },
          { nickname: 'dogwater' },
          { nickname: 'artcreator' },
          { nickname: 'musicvibes' }
        ]
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
    
    console.log(`\n👥 Найдено создателей: ${creators.length}`)
    
    for (const creator of creators) {
      console.log(`\n🎨 Обрабатываем: ${creator.nickname}`)
      
      // Flash Sale для Basic подписки - 50% скидка
      try {
        const basicSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            discount: 50,
            subscriptionPlan: 'basic',
            startAt: new Date(),
            endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней
            isActive: true,
            maxRedemptions: 100,
            usedCount: 0
          }
        })
        console.log(`✅ Basic план: -${basicSale.discount}%`)
      } catch(e) {
        console.log(`⚠️  Basic план уже существует`)
      }
      
      // Flash Sale для Premium подписки - 30% скидка
      try {
        const premiumSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            discount: 30,
            subscriptionPlan: 'premium',
            startAt: new Date(),
            endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
            isActive: true,
            maxRedemptions: 50,
            usedCount: 0
          }
        })
        console.log(`✅ Premium план: -${premiumSale.discount}%`)
      } catch(e) {
        console.log(`⚠️  Premium план уже существует`)
      }
      
      // Flash Sale для VIP подписки - 20% скидка
      try {
        const vipSale = await prisma.flashSale.create({
          data: {
            creatorId: creator.id,
            discount: 20,
            subscriptionPlan: 'vip',
            startAt: new Date(),
            endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 дня
            isActive: true,
            maxRedemptions: 20,
            usedCount: 0
          }
        })
        console.log(`✅ VIP план: -${vipSale.discount}%`)
      } catch(e) {
        console.log(`⚠️  VIP план уже существует`)
      }
      
      // Flash Sales для постов - 25% скидка
      if (creator.posts.length > 0) {
        for (const post of creator.posts) {
          try {
            const postSale = await prisma.flashSale.create({
              data: {
                creatorId: creator.id,
                postId: post.id,
                discount: 25,
                startAt: new Date(),
                endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 дней
                isActive: true,
                maxRedemptions: 100,
                usedCount: 0
              }
            })
            console.log(`✅ Пост "${post.title}": -${postSale.discount}%`)
          } catch(e) {
            console.log(`⚠️  Flash Sale для поста "${post.title}" уже существует`)
          }
        }
      }
    }
    
    // Итоговая статистика
    const totalSales = await prisma.flashSale.count()
    const salesByType = await prisma.flashSale.groupBy({
      by: ['subscriptionPlan'],
      _count: true,
      where: {
        subscriptionPlan: { not: null }
      }
    })
    
    const postSales = await prisma.flashSale.count({
      where: { postId: { not: null } }
    })
    
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:')
    console.log(`   Всего Flash Sales: ${totalSales}`)
    console.log(`   Для подписок: ${salesByType.reduce((sum, s) => sum + s._count, 0)}`)
    console.log(`   Для постов: ${postSales}`)
    
    console.log('\n🎉 Flash Sales успешно созданы на продакшне!')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createFlashSales()
EOF

# Запускаем скрипт
echo "🔧 Запускаем создание Flash Sales..."
node scripts/temp-create-flash-sales.js

# Удаляем временный файл
rm scripts/temp-create-flash-sales.js

echo "✅ Готово!"
ENDSSH

echo "🎉 Flash Sales созданы на продакшн сервере!" 