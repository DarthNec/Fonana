const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixVideoThumbnails() {
  console.log('=== Исправление thumbnail для видео постов ===\n')

  try {
    // 1. Находим все посты с типом video
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
      }
    })

    console.log(`Найдено видео постов: ${videoPosts.length}\n`)

    if (videoPosts.length === 0) {
      console.log('Видео посты не найдены')
      return
    }

    let fixedCount = 0

    // 2. Проверяем и исправляем каждый пост
    for (const post of videoPosts) {
      const needsFix = post.thumbnail && 
                      (post.thumbnail.includes('.mp4') || 
                       post.thumbnail.includes('.webm') ||
                       post.thumbnail === post.mediaUrl)

      if (needsFix) {
        console.log(`Исправляю пост: "${post.title}" от @${post.creator.nickname}`)
        console.log(`  Старый thumbnail: ${post.thumbnail}`)
        
        // Обновляем thumbnail на placeholder
        await prisma.post.update({
          where: { id: post.id },
          data: {
            thumbnail: '/placeholder-video.png'
          }
        })
        
        console.log(`  ✅ Новый thumbnail: /placeholder-video.png`)
        fixedCount++
      } else if (post.thumbnail === '/placeholder-video.png') {
        console.log(`✓ Пост "${post.title}" уже имеет правильный thumbnail`)
      } else {
        console.log(`? Пост "${post.title}" имеет нестандартный thumbnail: ${post.thumbnail}`)
      }
    }

    console.log(`\n✅ Исправлено постов: ${fixedCount}`)

    // 3. Проверяем аудио посты тоже
    console.log('\n=== Проверка аудио постов ===\n')
    
    const audioPosts = await prisma.post.findMany({
      where: {
        type: 'audio'
      },
      include: {
        creator: {
          select: {
            nickname: true
          }
        }
      }
    })

    console.log(`Найдено аудио постов: ${audioPosts.length}`)
    
    let fixedAudioCount = 0
    
    for (const post of audioPosts) {
      const needsFix = post.thumbnail && 
                      (post.thumbnail.includes('.mp3') || 
                       post.thumbnail.includes('.wav') ||
                       post.thumbnail === post.mediaUrl)

      if (needsFix) {
        console.log(`Исправляю аудио пост: "${post.title}" от @${post.creator.nickname}`)
        
        await prisma.post.update({
          where: { id: post.id },
          data: {
            thumbnail: '/placeholder-audio.png'
          }
        })
        
        fixedAudioCount++
      }
    }

    if (fixedAudioCount > 0) {
      console.log(`\n✅ Исправлено аудио постов: ${fixedAudioCount}`)
    }

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixVideoThumbnails().catch(console.error) 