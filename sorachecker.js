const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

const prisma = new PrismaClient()


// Конфигурация
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
const BUNNY_STORAGE_API_KEY = 'a77f510a-47a5-4025-9b93e7a7beae-a283-4368'
const BUNNY_STORAGE_ZONE = 'fonanastorage'
const BUNNY_STORAGE_HOST = 'https://storage.bunnycdn.com'
const BUNNY_CDN_HOST = 'https://fonanastorage.b-cdn.net'
const BUNNY_PATHS = {
  sora: 'posts/videos/sora'
}
const TEMP_DIR = path.join(__dirname, 'temp_sora_videos')

// Создаем временную директорию если её нет
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

/**
 * Получает все посты с type === 'ai-video' и mediaUrl === null
 */
async function getPendingAIVideoPosts() {
  try {
    console.log('[SoraChecker] Fetching pending AI video posts...')
    
    const posts = await prisma.post.findMany({
      where: {
        type: 'ai-video',
        mediaUrl: null,
        requestId: {
          not: null
        }
      }
    })
    
    console.log(`[SoraChecker] Found ${posts.length} pending AI video posts`)
    return posts
  } catch (error) {
    console.error('[SoraChecker] Error fetching posts:', error)
    return []
  }
}

/**
 * Проверяет статус видео в OpenAI
 */
async function checkSoraVideoStatus(requestId) {
  try {
    console.log(`[SoraChecker] Checking status for video ${requestId}`)
    
    const response = await axios.get(
      `https://api.openai.com/v1/videos/${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    )
    
    console.log(`[SoraChecker] Video ${requestId} status:`, response.data.status)
    return response.data
  } catch (error) {
    console.error(`[SoraChecker] Error checking video status ${requestId}:`, error.response?.data || error.message)
    return null
  }
}

/**
 * Скачивает видео с OpenAI
 */
async function downloadSoraVideo(requestId) {
  try {
    console.log(`[SoraChecker] Downloading video ${requestId}...`)
    
    const response = await axios.get(
      `https://api.openai.com/v1/videos/${requestId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        responseType: 'arraybuffer'
      }
    )
    
    const filePath = path.join(TEMP_DIR, `${requestId}_original.mp4`)
    fs.writeFileSync(filePath, response.data)
    
    console.log(`[SoraChecker] Video downloaded to ${filePath}`)
    return filePath
  } catch (error) {
    console.error(`[SoraChecker] Error downloading video ${requestId}:`, error.message)
    return null
  }
}

/**
 * Накладывает водяной знак на видео с помощью ffmpeg
 */
async function addWatermark(inputPath, requestId, videoDuration) {
  try {
    console.log(`[SoraChecker] Adding watermark to video ${requestId} (duration: ${videoDuration}s)...`)
    
    const outputPath = path.join(TEMP_DIR, `${requestId}_watermarked.mp4`)
    const watermarkPath = path.join(__dirname, 'watermark200x112-15.png')
    
    // Проверяем наличие файла водяного знака
    if (!fs.existsSync(watermarkPath)) {
      console.warn(`[SoraChecker] Watermark image not found at ${watermarkPath}, skipping watermark`)
      return inputPath
    }
    
    // FFmpeg команда для наложения анимированного водяного знака
    // Водяной знак движется по диагонали от левого верхнего к правому нижнему углу
    // x и y вычисляются динамически на основе времени (t) и размеров видео (W, H)
    // Используем videoDuration из Sora API вместо функции duration
    const command = `
        ffmpeg -i "${inputPath}" -i "${watermarkPath}" \
        -filter_complex "[0:v][1:v]overlay=x='t/${videoDuration}*(W-w)':y='t/${videoDuration}*(H-h)':format=auto" \
        -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart -c:a copy \
        "${outputPath}"
        `;


    
    console.log(`[SoraChecker] FFmpeg command: ${command}`)
    
    await execPromise(command)
    
    console.log(`[SoraChecker] Watermark added, saved to ${outputPath}`)
    return outputPath
  } catch (error) {
    console.error(`[SoraChecker] Error adding watermark to ${requestId}:`, error.message)
    
    // Если ffmpeg не установлен или ошибка, возвращаем оригинальный файл
    console.warn(`[SoraChecker] Skipping watermark for ${requestId}, using original file`)
    return inputPath
  }
}

/**
 * Загружает видео на Bunny Storage
 */
async function uploadToBunnyStorage(filePath, requestId) {
  try {
    console.log(`[SoraChecker] Uploading video ${requestId} to Bunny Storage...`)
    
    const fileName = `${requestId}.mp4`
    const bunnyPath = `${BUNNY_PATHS.sora}/${fileName}`
    const fileBuffer = fs.readFileSync(filePath)
    
    // Полный URL для загрузки в Bunny Storage
    const uploadUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`
    
    console.log(`[SoraChecker] Upload URL: ${uploadUrl}`)
    
    const response = await axios.put(
      uploadUrl,
      fileBuffer,
      {
        headers: {
          'AccessKey': BUNNY_STORAGE_API_KEY,
          'Content-Type': 'video/mp4'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )
    
    // CDN URL для доступа к файлу
    const cdnUrl = `${BUNNY_CDN_HOST}/${bunnyPath}`
    console.log(`[SoraChecker] Video uploaded to Bunny: ${cdnUrl}`)
    
    return cdnUrl
  } catch (error) {
    console.error(`[SoraChecker] Error uploading to Bunny Storage:`, error.response?.data || error.message)
    return null
  }
}

/**
 * Удаляет видео из OpenAI
 */
async function deleteSoraVideo(requestId) {
  try {
    console.log(`[SoraChecker] Deleting video ${requestId} from OpenAI...`)
    
    await axios.delete(
      `https://api.openai.com/v1/videos/${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    )
    
    console.log(`[SoraChecker] Video ${requestId} deleted from OpenAI`)
    return true
  } catch (error) {
    console.error(`[SoraChecker] Error deleting video ${requestId}:`, error.response?.data || error.message)
    return false
  }
}

/**
 * Обновляет пост с mediaUrl
 */
async function updatePostWithVideo(postId, mediaUrl) {
  try {
    console.log(`[SoraChecker] Updating post ${postId} with video URL...`)
    
    await prisma.post.update({
      where: { id: postId },
      data: {
        mediaUrl: mediaUrl,
        type: 'video' // Меняем тип с ai-video на video
      }
    })
    
    console.log(`[SoraChecker] Post ${postId} updated successfully`)
    return true
  } catch (error) {
    console.error(`[SoraChecker] Error updating post ${postId}:`, error)
    return false
  }
}

/**
 * Очищает временные файлы
 */
function cleanupTempFiles(requestId) {
  try {
    const originalPath = path.join(TEMP_DIR, `${requestId}_original.mp4`)
    const watermarkedPath = path.join(TEMP_DIR, `${requestId}_watermarked.mp4`)
    
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath)
      console.log(`[SoraChecker] Deleted temp file: ${originalPath}`)
    }
    
    if (fs.existsSync(watermarkedPath)) {
      fs.unlinkSync(watermarkedPath)
      console.log(`[SoraChecker] Deleted temp file: ${watermarkedPath}`)
    }
  } catch (error) {
    console.error(`[SoraChecker] Error cleaning up temp files for ${requestId}:`, error)
  }
}

/**
 * Обрабатывает один пост
 */
async function processPost(post) {
  console.log(`\n[SoraChecker] ==========================================`)
  console.log(`[SoraChecker] Processing post ${post.id} (requestId: ${post.requestId})`)
  
  try {
    // 1. Проверяем статус видео в OpenAI
    const videoStatus = await checkSoraVideoStatus(post.requestId)
    
    if (!videoStatus) {
      console.log(`[SoraChecker] Could not get status for ${post.requestId}, skipping...`)
      return false
    }
    
    // 2. Проверяем на ошибки
    if (videoStatus.error) {
      console.error(`[SoraChecker] Video ${post.requestId} has error:`, {
        code: videoStatus.error.code,
        message: videoStatus.error.message
      })
      
      // Обновляем пост с сообщением об ошибке
      console.log(`[SoraChecker] Updating post ${post.id} with error message...`)
      await prisma.post.update({
        where: { id: post.id },
        data: {
          error: videoStatus.error.message,
          mediaUrl: "/"
        }
      })
      console.log(`[SoraChecker] Post ${post.id} updated with error message`)
      
      // Удаляем видео из OpenAI
      await deleteSoraVideo(post.requestId)
      
      return false
    }
    
    // 3. Проверяем, готово ли видео
    if (videoStatus.status !== 'completed') {
      console.log(`[SoraChecker] Video ${post.requestId} is not ready yet (status: ${videoStatus.status}, progress: ${videoStatus.progress || 0})`)
      return false
    }
    
    // 4. Скачиваем видео
    const downloadedPath = await downloadSoraVideo(post.requestId)
    if (!downloadedPath) {
      console.error(`[SoraChecker] Failed to download video ${post.requestId}`)
      return false
    }
    
    // 5. Накладываем водяной знак
    const videoDuration = parseInt(videoStatus.seconds) || 12 // Используем длительность из Sora API
    const watermarkedPath = await addWatermark(downloadedPath, post.requestId, videoDuration)
    
    // 6. Загружаем на Bunny Storage
    const bunnyUrl = await uploadToBunnyStorage(watermarkedPath, post.requestId)
    if (!bunnyUrl) {
      console.error(`[SoraChecker] Failed to upload to Bunny Storage for ${post.requestId}`)
      cleanupTempFiles(post.requestId)
      return false
    }
    
    // 7. Обновляем пост
    const updated = await updatePostWithVideo(post.id, bunnyUrl)
    if (!updated) {
      console.error(`[SoraChecker] Failed to update post ${post.id}`)
      cleanupTempFiles(post.requestId)
      return false
    }
    
    // 8. Удаляем видео из OpenAI
    await deleteSoraVideo(post.requestId)
    
    // 9. Очищаем временные файлы
    cleanupTempFiles(post.requestId)
    
    console.log(`[SoraChecker] ✅ Post ${post.id} processed successfully!`)
    return true
    
  } catch (error) {
    console.error(`[SoraChecker] Error processing post ${post.id}:`, error)
    cleanupTempFiles(post.requestId)
    return false
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('[SoraChecker] Starting Sora video checker...')
  console.log('[SoraChecker] Timestamp:', new Date().toISOString())
  
  try {
    // Получаем все посты с незагруженными AI видео
    const posts = await getPendingAIVideoPosts()
    
    if (posts.length === 0) {
      console.log('[SoraChecker] No pending AI video posts found')
      return
    }
    
    // Обрабатываем каждый пост
    let successCount = 0
    let failedCount = 0
    
    for (const post of posts) {
      const success = await processPost(post)
      if (success) {
        successCount++
      } else {
        failedCount++
      }
      
      // Небольшая задержка между обработкой постов
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n[SoraChecker] ==========================================')
    console.log(`[SoraChecker] Processing complete!`)
    console.log(`[SoraChecker] Total: ${posts.length} | Success: ${successCount} | Failed: ${failedCount}`)
    console.log('[SoraChecker] ==========================================\n')
    
  } catch (error) {
    console.error('[SoraChecker] Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем скрипт
if (require.main === module) {
  main()
    .then(() => {
      console.log('[SoraChecker] Script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[SoraChecker] Script failed:', error)
      process.exit(1)
    })
}

module.exports = { main }

