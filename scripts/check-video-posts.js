const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkVideoPosts() {
  console.log('=== Проверка видео постов ===\n')

  try {
    // 1. Ищем все посты с типом video
    const videoPosts = await prisma.post.findMany({
      where: {
        type: 'video'
      },
      include: {
        creator: {
          select: {
            nickname: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Найдено видео постов: ${videoPosts.length}\n`)

    if (videoPosts.length === 0) {
      console.log('Видео посты не найдены')
      return
    }

    // 2. Проверяем каждый пост
    videoPosts.forEach((post, index) => {
      console.log(`${index + 1}. Пост от @${post.creator.nickname}:`)
      console.log(`   ID: ${post.id}`)
      console.log(`   Заголовок: ${post.title}`)
      console.log(`   Создан: ${post.createdAt.toLocaleDateString()}`)
      console.log(`   MediaURL: ${post.mediaUrl || 'НЕ УСТАНОВЛЕН'}`)
      console.log(`   Thumbnail: ${post.thumbnail || 'НЕ УСТАНОВЛЕН'}`)
      
      // Проверяем формат URL
      if (post.mediaUrl) {
        if (post.mediaUrl.startsWith('http')) {
          console.log(`   ⚠️  ВНИМАНИЕ: Абсолютный URL (может не работать)`)
        } else if (!post.mediaUrl.startsWith('/')) {
          console.log(`   ⚠️  ВНИМАНИЕ: Относительный URL без начального слеша`)
        } else if (post.mediaUrl.includes('/videos/')) {
          console.log(`   ✅ URL выглядит корректно`)
        } else {
          console.log(`   ⚠️  ВНИМАНИЕ: Неожиданный формат URL`)
        }
      }
      console.log('')
    })

    // 3. Ищем посты юзера dogwater
    console.log('\n=== Посты пользователя dogwater ===')
    const dogwaterUser = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: 'dogwater',
          mode: 'insensitive'
        }
      }
    })

    if (dogwaterUser) {
      const dogwaterPosts = await prisma.post.findMany({
        where: {
          creatorId: dogwaterUser.id
        },
        select: {
          id: true,
          title: true,
          type: true,
          mediaUrl: true,
          thumbnail: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log(`Найдено постов: ${dogwaterPosts.length}`)
      dogwaterPosts.forEach(post => {
        console.log(`\n- ${post.title} (${post.type})`)
        console.log(`  ID: ${post.id}`)
        console.log(`  MediaURL: ${post.mediaUrl || 'НЕТ'}`)
        console.log(`  Thumbnail: ${post.thumbnail || 'НЕТ'}`)
      })
    } else {
      console.log('Пользователь dogwater не найден')
    }

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkVideoPosts().catch(console.error) 