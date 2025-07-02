const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testLikesAPI() {
  try {
    console.log('🔍 Testing Likes API...')
    
    // 1. Проверяем количество лайков в базе
    const totalLikes = await prisma.like.count()
    console.log(`📊 Total likes in database: ${totalLikes}`)
    
    // 2. Проверяем посты с лайками
    const postsWithLikes = await prisma.post.findMany({
      where: {
        likesCount: {
          gt: 0
        }
      },
      select: {
        id: true,
        title: true,
        likesCount: true,
        _count: {
          select: {
            likes: true
          }
        }
      },
      take: 5
    })
    
    console.log('\n📝 Posts with likes:')
    postsWithLikes.forEach(post => {
      console.log(`  - ${post.title} (ID: ${post.id})`)
      console.log(`    Database likesCount: ${post.likesCount}`)
      console.log(`    Actual likes count: ${post._count.likes}`)
      console.log(`    Status: ${post.likesCount === post._count.likes ? '✅ OK' : '❌ MISMATCH'}`)
    })
    
    // 3. Проверяем конкретный лайк
    const sampleLike = await prisma.like.findFirst({
      where: {
        postId: { not: null }
      },
      include: {
        user: {
          select: { nickname: true, fullName: true }
        },
        post: {
          select: { title: true, likesCount: true }
        }
      }
    })
    
    if (sampleLike) {
      console.log('\n👤 Sample like:')
      console.log(`  User: ${sampleLike.user.fullName || sampleLike.user.nickname}`)
      console.log(`  Post: ${sampleLike.post.title}`)
      console.log(`  Post likesCount: ${sampleLike.post.likesCount}`)
      console.log(`  Created: ${sampleLike.createdAt}`)
    }
    
    // 4. Проверяем уведомления
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'LIKE_POST'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('\n🔔 Recent like notifications:')
    notifications.forEach(notification => {
      console.log(`  - ${notification.title}: ${notification.message}`)
      console.log(`    Created: ${notification.createdAt}`)
      console.log(`    Read: ${notification.isRead}`)
    })
    
  } catch (error) {
    console.error('❌ Error testing likes API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLikesAPI() 