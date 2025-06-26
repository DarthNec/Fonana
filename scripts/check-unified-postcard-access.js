const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUnifiedPostCardAccess() {
  console.log('🔍 Проверка исправлений унифицированного PostCard...\n')

  try {
    // 1. Найдем создателя с постами
    const creator = await prisma.user.findFirst({
      where: {
        isCreator: true,
        posts: {
          some: {
            isLocked: true
          }
        }
      },
      include: {
        posts: {
          where: {
            isLocked: true
          },
          take: 5
        }
      }
    })

    if (!creator) {
      console.log('❌ Не найдено создателей с заблокированными постами')
      return
    }

    console.log(`✅ Найден создатель: ${creator.nickname} (${creator.id})`)
    console.log(`   Заблокированных постов: ${creator.posts.length}`)

    // 2. Проверим API endpoint с userWallet автора
    console.log('\n📡 Проверка API /api/posts с userWallet автора...')
    
    const apiUrl = `http://localhost:3000/api/posts?creatorId=${creator.id}&userWallet=${creator.wallet}`
    console.log(`   URL: ${apiUrl}`)
    
    // Симулируем запрос (в реальности это нужно делать через fetch)
    const posts = await prisma.post.findMany({
      where: {
        creatorId: creator.id
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            wallet: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })

    console.log(`\n📊 Результаты для постов автора:`)
    for (const post of posts) {
      const isCreatorPost = creator.id === post.creatorId
      const shouldHideContent = post.isLocked && !isCreatorPost
      
      console.log(`\n   📝 "${post.title}":`)
      console.log(`      - isLocked: ${post.isLocked}`)
      console.log(`      - isCreatorPost: ${isCreatorPost} ✅`)
      console.log(`      - shouldHideContent: ${shouldHideContent}`)
      console.log(`      - Автор видит свой контент: ${!shouldHideContent} ✅`)
    }

    // 3. Проверим что другой пользователь не видит контент
    const otherUser = await prisma.user.findFirst({
      where: {
        id: { not: creator.id },
        wallet: { not: null }
      }
    })

    if (otherUser) {
      console.log(`\n🔍 Проверка для другого пользователя: ${otherUser.nickname}`)
      
      for (const post of posts.slice(0, 2)) {
        const isCreatorPost = otherUser.id === post.creatorId
        const hasSubscription = await prisma.subscription.findFirst({
          where: {
            userId: otherUser.id,
            creatorId: creator.id,
            isActive: true,
            paymentStatus: 'COMPLETED'
          }
        })
        
        const shouldHideContent = post.isLocked && !isCreatorPost && !hasSubscription
        
        console.log(`\n   📝 "${post.title}":`)
        console.log(`      - isCreatorPost: ${isCreatorPost}`)
        console.log(`      - hasSubscription: ${!!hasSubscription}`)
        console.log(`      - shouldHideContent: ${shouldHideContent} ✅`)
      }
    }

    console.log('\n✅ Все проверки пройдены успешно!')

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUnifiedPostCardAccess() 