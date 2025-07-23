// Script to extract thumbnails from existing video posts
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const { exec } = require('child_process')
const { promisify } = require('util')

const prisma = new PrismaClient()
const execAsync = promisify(exec)

async function extractVideoThumbnail(videoPath, outputPath, timestamp = '00:00:01') {
  try {
    // Check if ffmpeg is available
    try {
      await execAsync('which ffmpeg')
    } catch {
      console.error('ffmpeg is not installed')
      return false
    }

    // Extract frame at specified timestamp
    const command = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 "${outputPath}" -y`
    
    console.log('Extracting video thumbnail with command:', command)
    
    const { stderr } = await execAsync(command)
    
    // ffmpeg writes to stderr even on success
    if (stderr && !stderr.includes('frame=')) {
      console.error('ffmpeg stderr:', stderr)
    }
    
    // Check if output file was created
    try {
      await fs.promises.access(outputPath)
      console.log('Video thumbnail extracted successfully:', outputPath)
      return true
    } catch {
      console.error('Failed to create thumbnail file')
      return false
    }
    
  } catch (error) {
    console.error('Error extracting video thumbnail:', error)
    return false
  }
}

async function getVideoDuration(videoPath) {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    const { stdout } = await execAsync(command)
    const duration = parseFloat(stdout.trim())
    
    if (!isNaN(duration)) {
      return duration
    }
    
    return null
  } catch (error) {
    console.error('Error getting video duration:', error)
    return null
  }
}

async function generateVideoThumbnailAtPercentage(videoPath, outputPath, percentage = 10) {
  try {
    // Get video duration
    const duration = await getVideoDuration(videoPath)
    
    if (!duration) {
      // Fallback to 1 second if can't get duration
      return extractVideoThumbnail(videoPath, outputPath, '00:00:01')
    }
    
    // Calculate timestamp at percentage
    const timestampSeconds = (duration * percentage) / 100
    const hours = Math.floor(timestampSeconds / 3600)
    const minutes = Math.floor((timestampSeconds % 3600) / 60)
    const seconds = Math.floor(timestampSeconds % 60)
    
    const timestamp = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    return extractVideoThumbnail(videoPath, outputPath, timestamp)
  } catch (error) {
    console.error('Error generating video thumbnail at percentage:', error)
    return false
  }
}

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