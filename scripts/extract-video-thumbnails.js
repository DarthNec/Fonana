// Script to extract thumbnails from existing video posts
const { PrismaClient } = require('@prisma/client')
const { generateVideoThumbnailAtPercentage } = require('../lib/utils/video-processor')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const prisma = new PrismaClient()

async function extractVideoThumbnails() {
  try {
    console.log('🎬 Extracting thumbnails from existing video posts...')
    
    // Find all video posts
    const videoPosts = await prisma.post.findMany({
      where: {
        type: 'video',
        mediaUrl: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        mediaUrl: true
      }
    })
    
    console.log(`Found ${videoPosts.length} video posts`)
    
    let extracted = 0
    let failed = 0
    
    for (const post of videoPosts) {
      // Skip if already has a real thumbnail (not placeholder)
      if (post.thumbnail && !post.thumbnail.includes('placeholder')) {
        console.log(`⏭️  Skipping "${post.title}" - already has thumbnail`)
        continue
      }
      
      // Extract filename from mediaUrl
      const videoFileName = path.basename(post.mediaUrl)
      const videoPath = path.join('/var/www/fonana/public', post.mediaUrl)
      
      // Check if video file exists
      if (!fs.existsSync(videoPath)) {
        console.log(`❌ Video file not found: ${videoPath}`)
        failed++
        continue
      }
      
      // Generate thumbnail filename
      const hash = path.basename(videoFileName, path.extname(videoFileName))
      const thumbFileName = `thumb_${hash}.jpg`
      const thumbPath = path.join('/var/www/fonana/public/posts/videos', thumbFileName)
      
      console.log(`📸 Extracting thumbnail for: ${post.title}`)
      
      // Extract thumbnail at 10% of video duration
      const success = await generateVideoThumbnailAtPercentage(
        videoPath,
        thumbPath,
        10
      )
      
      if (success) {
        // Optimize the thumbnail
        try {
          const optimizedThumbPath = path.join('/var/www/fonana/public/posts/videos', `thumb_${hash}.webp`)
          await sharp(thumbPath)
            .resize(800, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 85 })
            .toFile(optimizedThumbPath)
          
          // Remove original jpg
          fs.unlinkSync(thumbPath)
          
          // Update database with new thumbnail URL
          const thumbnailUrl = `/posts/videos/thumb_${hash}.webp`
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: thumbnailUrl }
          })
          
          extracted++
          console.log(`✅ Extracted thumbnail for: ${post.title}`)
        } catch (error) {
          console.error(`❌ Error optimizing thumbnail for ${post.title}:`, error)
          failed++
        }
      } else {
        console.log(`❌ Failed to extract thumbnail for: ${post.title}`)
        failed++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Successfully extracted: ${extracted} thumbnails`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏭️  Skipped: ${videoPosts.length - extracted - failed}`)
    
  } catch (error) {
    console.error('❌ Error extracting video thumbnails:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the extraction
extractVideoThumbnails() 