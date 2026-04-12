import { BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_STORAGE_HOST, BUNNY_CDN_HOST, BUNNY_PATHS } from '@/lib/constants/bunny-storage'
import crypto from 'crypto'
import path from 'path'

export interface BunnyUploadResult {
  success: boolean
  fileUrl?: string
  thumbUrl?: string
  previewUrl?: string
  blurUrl?: string
  error?: string
}

export async function uploadToBunnyStorage(
  file: File, 
  type: 'image' | 'video' | 'audio' | 'support' | 'avatars' | 'messages' | 'blur' | 'video-preview',
  customPath?: string
): Promise<BunnyUploadResult> {
  try {
    console.log('🎯 [BUNNY UPLOAD] Starting upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      contentType: type
    })

    // Генерируем уникальное имя файла
    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    
    // 🔥 FIX 2026-03-09: Безопасное извлечение расширения с fallback
    let ext = path.extname(file.name).toLowerCase()
    
    // Если расширения нет или оно пустое - определяем по MIME type
    if (!ext || ext.length === 0) {
      const mimeToExt: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/wav': '.wav',
        'audio/webm': '.webm'
      }
      ext = mimeToExt[file.type] || '.bin'
      console.warn(`⚠️ [BUNNY UPLOAD] No extension in filename "${file.name}", using MIME-based fallback: ${ext}`)
    }
    
    // Санитизация расширения: только разрешённые символы (a-z, 0-9, точка)
    if (!/^\.[a-z0-9]+$/.test(ext)) {
      const originalExt = ext
      ext = ext.replace(/[^.a-z0-9]/g, '')
      if (ext.length === 0 || ext === '.') {
        // Если после санитизации ничего не осталось - fallback к MIME type
        const mimeToExt: Record<string, string> = {
          'video/mp4': '.mp4',
          'video/webm': '.webm',
          'video/quicktime': '.mov',
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'audio/mpeg': '.mp3'
        }
        ext = mimeToExt[file.type] || '.bin'
      }
      console.warn(`⚠️ [BUNNY UPLOAD] Invalid extension "${originalExt}", sanitized to: ${ext}`)
    }
    
    const fileName = `${hash}${ext}`
    
    console.log('🎯 [BUNNY UPLOAD] Generated filename:', {
      originalName: file.name,
      extractedExt: path.extname(file.name),
      finalExt: ext,
      fileName,
      mimeType: file.type
    })

    // Определяем путь в BunnyStorage
    let bunnyPath: string
    
    if (customPath) {
      // Используем custom путь если он указан
      bunnyPath = `${customPath}/${fileName}`
    } else if (type === 'support') {
      bunnyPath = `${BUNNY_PATHS.support.images}/${fileName}`
    } else if (type === 'avatars') {
      bunnyPath = `${BUNNY_PATHS.avatars}/${fileName}`
    } else if (type === 'messages') {
      // Для сообщений определяем тип медиа по MIME типу файла
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const mediaType = isImage ? 'images' : isVideo ? 'videos' : isAudio ? 'audio' : 'images' // fallback к images
      bunnyPath = `${BUNNY_PATHS.messages[mediaType]}/${fileName}`
    } else if (type === 'blur') {
      // Для размытых изображений
      bunnyPath = `posts/blur/${fileName}`
    } else if (type === 'video-preview') {
      // Для превью видео (первый кадр)
      bunnyPath = `posts/videos/preview/${fileName}`
    } else {
      const mediaType = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio'
      bunnyPath = `${BUNNY_PATHS.posts[mediaType]}/${fileName}`
    }
    const bunnyUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`

    console.log('🎯 [BUNNY UPLOAD] Upload URL:', bunnyUrl)

    // Загружаем файл в BunnyStorage
    const response = await fetch(bunnyUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🎯 [BUNNY UPLOAD] Upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Bunny upload failed: ${response.status} - ${errorText}`)
    }

    // Формируем CDN URL для доступа к файлу
    const cdnUrl = `${BUNNY_CDN_HOST}/${bunnyPath}`

    console.log('🎯 [BUNNY UPLOAD] Upload successful:', {
      fileName,
      bunnyPath,
      cdnUrl
    })

    return {
      success: true,
      fileUrl: cdnUrl,
      thumbUrl: type === 'image' ? cdnUrl : undefined, // Для изображений thumbUrl = fileUrl
      // previewUrl НЕ устанавливается здесь - оно будет установлено отдельно для video-preview типа
      previewUrl: type === 'video-preview' ? cdnUrl : undefined
    }

  } catch (error) {
    console.error('🎯 [BUNNY UPLOAD] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 