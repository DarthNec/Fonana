// Script to update existing video posts with new enhanced thumbnail
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateVideoThumbnails() {
  try {
    console.log('🎬 Updating video post thumbnails...')
    
    // Find all video posts
    const videoPosts = await prisma.post.findMany({
      where: {
        type: 'video'
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        mediaUrl: true
      }
    })
    
    console.log(`Found ${videoPosts.length} video posts`)
    
    let updated = 0
    
    for (const post of videoPosts) {
      // Skip if already using enhanced placeholder
      if (post.thumbnail === '/placeholder-video-enhanced.png') {
        continue
      }
      
      // Update to use enhanced placeholder
      await prisma.post.update({
        where: { id: post.id },
        data: {
          thumbnail: '/placeholder-video-enhanced.png'
        }
      })
      
      updated++
      console.log(`✅ Updated: ${post.title} (${post.id})`)
    }
    
    console.log(`\n🎉 Updated ${updated} video posts with enhanced thumbnails!`)
    
  } catch (error) {
    console.error('❌ Error updating video thumbnails:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateVideoThumbnails() 