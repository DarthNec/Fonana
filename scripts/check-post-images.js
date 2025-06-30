const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPostImages() {
  try {
    // Получаем последние посты с изображениями
    const posts = await prisma.post.findMany({
      where: {
        mediaUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        mediaUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log(`Found ${posts.length} posts with images\n`)

    posts.forEach(post => {
      console.log(`Post: ${post.title}`)
      console.log(`ID: ${post.id}`)
      console.log(`Media URL: ${post.mediaUrl}`)
      console.log(`Created: ${post.createdAt}`)
      console.log('---')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPostImages() 