import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestFlashSale() {
  try {
    console.log('🔍 Поиск авторов с постами...')
    
    // Находим автора с постами
    const creatorWithPosts = await prisma.user.findFirst({
      where: {
        isCreator: true,
        posts: {
          some: {
            isLocked: true,
            price: {
              gt: 0
            }
          }
        }
      },
      include: {
        posts: {
          where: {
            isLocked: true,
            price: {
              gt: 0
            }
          },
          take: 1
        }
      }
    })

    if (!creatorWithPosts || !creatorWithPosts.posts.length) {
      console.log('❌ Не найдено авторов с платными постами')
      return
    }

    const post = creatorWithPosts.posts[0]
    console.log(`✅ Найден пост: "${post.title}" от ${creatorWithPosts.nickname}`)

    // Создаем Flash Sale на 50% скидку на 24 часа
    const flashSale = await prisma.flashSale.create({
      data: {
        creatorId: creatorWithPosts.id,
        postId: post.id,
        discount: 50, // 50% скидка
        maxRedemptions: 10, // Максимум 10 использований
        startAt: new Date(),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
        isActive: true
      }
    })

    console.log('🎉 Flash Sale создана!')
    console.log(`   Пост: ${post.title}`)
    console.log(`   Автор: ${creatorWithPosts.nickname}`)
    console.log(`   Скидка: ${flashSale.discount}%`)
    console.log(`   Действует до: ${flashSale.endAt.toLocaleString()}`)
    console.log(`   Максимум использований: ${flashSale.maxRedemptions}`)
    console.log(`\n🔗 Ссылка на пост: https://fonana.me/post/${post.id}`)

    // Создаем еще одну Flash Sale на подписку
    const subscriptionFlashSale = await prisma.flashSale.create({
      data: {
        creatorId: creatorWithPosts.id,
        subscriptionPlan: 'basic',
        discount: 30, // 30% скидка на базовую подписку
        maxRedemptions: 20,
        startAt: new Date(),
        endAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 часов
        isActive: true
      }
    })

    console.log('\n🎯 Flash Sale на подписку создана!')
    console.log(`   Автор: ${creatorWithPosts.nickname}`)
    console.log(`   План: Basic`)
    console.log(`   Скидка: ${subscriptionFlashSale.discount}%`)
    console.log(`   Действует до: ${subscriptionFlashSale.endAt.toLocaleString()}`)
    console.log(`\n🔗 Ссылка на профиль: https://fonana.me/creator/${creatorWithPosts.id}`)

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestFlashSale() 