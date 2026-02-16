const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)
const { updatePostInRemix, deletePostFromRemix } = require('./lib/remixFileSystem')

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
    
    // Проверяем, что директория существует
    if (!fs.existsSync(TEMP_DIR)) {
      console.log(`[SoraChecker] Creating temp directory: ${TEMP_DIR}`)
      fs.mkdirSync(TEMP_DIR, { recursive: true })
    }
    
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
 * Извлекает первый кадр из видео и создает превью в формате WebP
 */
async function extractVideoPreview(videoPath, requestId) {
  try {
    console.log(`[SoraChecker] Extracting preview from video ${requestId}...`)
    
    const previewPath = path.join(TEMP_DIR, `${requestId}_preview.png`)
    
    // FFmpeg команда для извлечения первого кадра
    const command = `ffmpeg -i "${videoPath}" -vframes 1 -f image2 "${previewPath}"`
    
    await execPromise(command)
    
    console.log(`[SoraChecker] Preview frame extracted to ${previewPath}`)
    return previewPath
  } catch (error) {
    console.error(`[SoraChecker] Error extracting preview from ${requestId}:`, error.message)
    return null
  }
}

/**
 * Загружает видео на Bunny Storage
 */
async function uploadToBunnyStorage(filePath, requestId) {
  try {
    console.log(`[SoraChecker] Uploading video ${requestId} to Bunny Storage...`)
    
    // Проверяем существование файла перед загрузкой
    if (!fs.existsSync(filePath)) {
      console.error(`[SoraChecker] File not found: ${filePath}`)
      return null
    }
    
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
 * Загружает превью изображение на Bunny Storage
 */
async function uploadPreviewToBunnyStorage(previewPath, requestId) {
  try {
    console.log(`[SoraChecker] Uploading preview for ${requestId} to Bunny Storage...`)
    
    // Проверяем существование файла перед загрузкой
    if (!fs.existsSync(previewPath)) {
      console.error(`[SoraChecker] Preview file not found: ${previewPath}`)
      return null
    }
    
    const fileName = `${requestId}_preview.webp`
    const bunnyPath = `posts/videos/preview/${fileName}`
    const fileBuffer = fs.readFileSync(previewPath)
    
    // Полный URL для загрузки в Bunny Storage
    const uploadUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`
    
    console.log(`[SoraChecker] Preview upload URL: ${uploadUrl}`)
    
    const response = await axios.put(
      uploadUrl,
      fileBuffer,
      {
        headers: {
          'AccessKey': BUNNY_STORAGE_API_KEY,
          'Content-Type': 'image/webp'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )
    
    // CDN URL для доступа к файлу
    const cdnUrl = `${BUNNY_CDN_HOST}/${bunnyPath}`
    console.log(`[SoraChecker] Preview uploaded to Bunny: ${cdnUrl}`)
    
    return cdnUrl
  } catch (error) {
    console.error(`[SoraChecker] Error uploading preview to Bunny Storage:`, error.response?.data || error.message)
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
 * Обновляет пост с mediaUrl и previewUrl
 */
async function updatePostWithVideo(postId, mediaUrl, previewUrl = null) {
  try {
    console.log(`[SoraChecker] Updating post ${postId} with video URL...`)
    
    const updateData = {
      mediaUrl: mediaUrl,
      type: 'video' // Меняем тип с ai-video на video
    }
    
    // Добавляем previewUrl если он есть
    if (previewUrl) {
      updateData.previewUrl = previewUrl
      console.log(`[SoraChecker] Including previewUrl: ${previewUrl}`)
    }
    
    await prisma.post.update({
      where: { id: postId },
      data: updateData
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
    const previewPath = path.join(TEMP_DIR, `${requestId}_preview.png`)
    
    let deletedCount = 0
    
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath)
      console.log(`[SoraChecker] Deleted temp file: ${originalPath}`)
      deletedCount++
    }
    
    if (fs.existsSync(watermarkedPath)) {
      fs.unlinkSync(watermarkedPath)
      console.log(`[SoraChecker] Deleted temp file: ${watermarkedPath}`)
      deletedCount++
    }
    
    if (fs.existsSync(previewPath)) {
      fs.unlinkSync(previewPath)
      console.log(`[SoraChecker] Deleted temp file: ${previewPath}`)
      deletedCount++
    }
    
    if (deletedCount === 0) {
      console.log(`[SoraChecker] No temp files found to clean up for ${requestId}`)
    } else {
      console.log(`[SoraChecker] Cleaned up ${deletedCount} temp file(s) for ${requestId}`)
    }
  } catch (error) {
    console.error(`[SoraChecker] Error cleaning up temp files for ${requestId}:`, error.message || error)
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
      
      // 🔥 ВОЗВРАЩАЕМ ГЕНЕРАЦИЮ ПОЛЬЗОВАТЕЛЮ
      // Если генерация отклонена, инкрементим availableGenerationCount на 1
      console.log(`[SoraChecker] Returning video generation to user ${post.creatorId}...`)
      try {
        const user = await prisma.user.findUnique({
          where: { id: post.creatorId },
          select: { availableGenerationCount: true, nickname: true }
        })
        
        if (user) {
          const newGenerationsCount = (user.availableGenerationCount || 0) + 1
          await prisma.user.update({
            where: { id: post.creatorId },
            data: { availableGenerationCount: newGenerationsCount }
          })
          console.log(`[SoraChecker] ✅ Video generation returned to user ${user.nickname || post.creatorId}: ${user.availableGenerationCount || 0} → ${newGenerationsCount}`)
        } else {
          console.warn(`[SoraChecker] User ${post.creatorId} not found, cannot return generation`)
        }
      } catch (refundError) {
        console.error(`[SoraChecker] Error returning generation to user ${post.creatorId}:`, refundError)
      }
      
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
      
      // Удаляем пост из файла ремикса (если файл существует)
      // 🔥 [REMIX_OPTIMIZATION_2025] Файл может не существовать для постов без ремиксов
      const containerId = post.containerId || post.id
      if (containerId) {
        const deleted = await deletePostFromRemixFile(containerId, post.id)
        if (deleted) {
          console.log(`[SoraChecker] Post ${post.id} removed from remix file due to error`)
        } else {
          console.log(`[SoraChecker] Remix file doesn't exist or post not in file (expected for posts without remixes)`)
        }
      }
      
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
    
    // 6. Извлекаем превью из видео (первый кадр)
    let previewUrl = null
    const previewPath = await extractVideoPreview(watermarkedPath, post.requestId)
    if (previewPath) {
      // Загружаем превью на Bunny Storage
      previewUrl = await uploadPreviewToBunnyStorage(previewPath, post.requestId)
      if (previewUrl) {
        console.log(`[SoraChecker] Preview uploaded successfully: ${previewUrl}`)
      } else {
        console.warn(`[SoraChecker] Failed to upload preview (non-critical)`)
      }
    } else {
      console.warn(`[SoraChecker] Failed to extract preview (non-critical)`)
    }
    
    // 7. Загружаем видео на Bunny Storage
    const bunnyUrl = await uploadToBunnyStorage(watermarkedPath, post.requestId)
    if (!bunnyUrl) {
      console.error(`[SoraChecker] Failed to upload to Bunny Storage for ${post.requestId}`)
      cleanupTempFiles(post.requestId)
      return false
    }
    
    // 8. Обновляем пост с mediaUrl и previewUrl
    const updated = await updatePostWithVideo(post.id, bunnyUrl, previewUrl)
    if (!updated) {
      console.error(`[SoraChecker] Failed to update post ${post.id}`)
      cleanupTempFiles(post.requestId)
      return false
    }
    
    // 9. Обновляем файл ремикса (меняем type с ai-video на video и обновляем mediaUrl)
    // 🔥 [REMIX_OPTIMIZATION_2025] Файл может не существовать для постов без ремиксов
    const containerId = post.containerId || post.id
    if (containerId) {
      const fileUpdated = await updateRemixFile(containerId, post.id, 'completed', bunnyUrl)
      if (fileUpdated) {
        console.log(`[SoraChecker] Remix file updated for post ${post.id}`)
      } else {
        console.log(`[SoraChecker] Remix file doesn't exist yet (expected for posts without remixes)`)
      }
    }
    
    // 9. Удаляем видео из OpenAI
    // await deleteSoraVideo(post.requestId)
    
    // 10. Очищаем временные файлы
    cleanupTempFiles(post.requestId)
    
    // 11. Отправляем уведомление в SocketIO
    await sendNotificationToSocketIO(post.creatorId, post.id, 'updated')
    
    console.log(`[SoraChecker] ✅ Post ${post.id} processed successfully!`)
    return true
    
  } catch (error) {
    console.error(`[SoraChecker] Error processing post ${post.id}:`, error)
    cleanupTempFiles(post.requestId)
    return false
  }
}

/**
 * Отправляет уведомление в SocketIO сервер
 */
async function sendNotificationToSocketIO(userId, postId, status) {
  try {
    await axios.post('http://localhost:3004/notify-ai-post/', {
      userId,
      postId,
      status
    }, {
      timeout: 5000 // 5 секунд таймаут
    })
    console.log(`[SoraChecker] Notification sent to SocketIO for post ${postId}`)
  } catch (error) {
    // Не логируем ошибку, так как это не критично для работы SoraChecker
    console.log(`[SoraChecker] Failed to send notification for post ${postId} (non-critical)`)
  }
}

/**
 * Обновляет статус поста в файловой системе
 * При status='completed' меняет type с 'ai-video' на 'video' и обновляет URL видео
 */
async function updateRemixFile(containerId, postId, status, mediaUrl = null) {
  try {
    console.log(`[SoraChecker] Updating remix file for post ${postId} with status ${status}...`)
    
    // Проверяем, что containerId задан
    if (!containerId) {
      console.warn(`[SoraChecker] containerId is not set for post ${postId}, skipping file update`)
      return false
    }
    
    const updates = {}
    
    // Добавляем mediaUrl если передан
    if (mediaUrl) {
      updates.mediaUrl = mediaUrl
      updates['media.url'] = mediaUrl
      console.log(`[SoraChecker] Including mediaUrl: ${mediaUrl}`)
    }
    
    // Если статус completed, меняем тип поста
    if (status === 'completed') {
      updates.type = 'video'
      updates['media.type'] = 'video'
    }
    
    const result = await updatePostInRemix(containerId, postId, updates)
    
    if (result) {
      console.log(`[SoraChecker] ✅ Remix file updated successfully for post ${postId}`)
    } else {
      console.log(`[SoraChecker] ⚠️ Failed to update remix file for post ${postId} (file may not exist yet - non-critical)`)
    }
    
    return result
  } catch (error) {
    console.error(`[SoraChecker] ⚠️ Failed to update remix file for post ${postId} (non-critical):`, error.message)
    return false
  }
}

/**
 * Удаляет пост из файла ремикса (используется при ошибках)
 */
async function deletePostFromRemixFile(containerId, postId) {
  try {
    console.log(`[SoraChecker] Deleting post ${postId} from remix file...`)
    
    // Проверяем, что containerId задан
    if (!containerId) {
      console.warn(`[SoraChecker] containerId is not set for post ${postId}, skipping file deletion`)
      return false
    }
    
    const result = await deletePostFromRemix(containerId, postId)
    
    if (result) {
      console.log(`[SoraChecker] ✅ Post ${postId} deleted from remix file`)
    } else {
      console.log(`[SoraChecker] ⚠️ Failed to delete post from remix file (file may not exist - non-critical)`)
    }
    
    return result
  } catch (error) {
    console.error(`[SoraChecker] ⚠️ Failed to delete post from remix file (non-critical):`, error.message)
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

