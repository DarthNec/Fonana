import { BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_STORAGE_HOST, BUNNY_CDN_HOST, BUNNY_PATHS } from '@/lib/constants/bunny-storage'
import crypto from 'crypto'
import path from 'path'

export interface BunnyUploadResult {
  success: boolean
  fileUrl?: string
  thumbUrl?: string
  previewUrl?: string
  error?: string
}

export async function uploadToBunnyStorage(
  file: File, 
  type: 'image' | 'video' | 'audio'
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
    const ext = path.extname(file.name)
    const fileName = `${hash}${ext}`

    // Определяем путь в BunnyStorage
    const mediaType = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio'
    const bunnyPath = `${BUNNY_PATHS.posts[mediaType]}/${fileName}`
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
      previewUrl: type === 'video' ? cdnUrl : undefined // Для видео previewUrl = fileUrl
    }

  } catch (error) {
    console.error('🎯 [BUNNY UPLOAD] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 