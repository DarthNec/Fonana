/**
 * Централизованная утилита для работы с thumbnails
 */

interface ThumbnailUrls {
  original: string | null
  thumb: string | null
  preview: string | null
}

/**
 * Проверяет валидность thumbnail пути
 */
export function isValidThumbnail(thumbnail: string | null | undefined): boolean {
  if (!thumbnail) return false
  
  // Проверяем на битые пути
  if (thumbnail.includes('thumb_.')) return false
  if (thumbnail.includes('thumb_/')) return false
  if (thumbnail === 'thumb_') return false
  if (thumbnail.endsWith('thumb_')) return false
  
  // Проверяем на пустое имя файла после thumb_
  const thumbMatch = thumbnail.match(/thumb_([^/]+)\.(webp|jpg|png|gif)/)
  if (thumbMatch && (!thumbMatch[1] || thumbMatch[1].length === 0)) {
    return false
  }
  
  return true
}

/**
 * Генерирует пути к оптимизированным изображениям
 * @param mediaUrl - оригинальный URL медиа файла
 * @param mediaType - тип медиа (image, video, audio)
 * @returns объект с путями или null если невалидный URL
 */
export function generateOptimizedImageUrls(
  mediaUrl: string | null | undefined,
  mediaType: 'image' | 'video' | 'audio' = 'image'
): ThumbnailUrls | null {
  if (!mediaUrl) return null
  
  // Проверяем, что это медиа файл в нашей системе
  if (!mediaUrl.includes('/posts/')) return null
  
  const lastSlashIndex = mediaUrl.lastIndexOf('/')
  const lastDotIndex = mediaUrl.lastIndexOf('.')
  
  // Валидация формата пути
  if (lastSlashIndex === -1 || lastDotIndex === -1 || lastDotIndex <= lastSlashIndex) {
    console.warn('[generateOptimizedImageUrls] Invalid mediaUrl format:', mediaUrl)
    return null
  }
  
  const dirPath = mediaUrl.substring(0, lastSlashIndex)
  const fileName = mediaUrl.substring(lastSlashIndex + 1)
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  
  // Проверка на пустое имя файла
  if (!nameWithoutExt || nameWithoutExt.trim() === '') {
    console.warn('[generateOptimizedImageUrls] Empty filename:', mediaUrl)
    return null
  }
  
  // Для видео и аудио используем placeholder
  if (mediaType === 'video') {
    return {
      original: mediaUrl,
      thumb: '/placeholder-video-enhanced.png',
      preview: '/placeholder-video-enhanced.png'
    }
  }
  
  if (mediaType === 'audio') {
    return {
      original: mediaUrl,
      thumb: '/placeholder-audio.png',
      preview: '/placeholder-audio.png'
    }
  }
  
  // Для изображений генерируем пути к оптимизированным версиям
  return {
    original: mediaUrl,
    thumb: `${dirPath}/thumb_${nameWithoutExt}.webp`,
    preview: `${dirPath}/preview_${nameWithoutExt}.webp`
  }
}

/**
 * Получает безопасный thumbnail с fallback
 * @param thumbnail - путь к thumbnail
 * @param original - оригинальный путь к медиа
 * @param mediaType - тип медиа
 * @returns безопасный путь к thumbnail
 */
export function getSafeThumbnail(
  thumbnail: string | null | undefined,
  original: string | null | undefined,
  mediaType: 'image' | 'video' | 'audio' = 'image'
): string {
  // Проверяем валидность thumbnail
  if (isValidThumbnail(thumbnail)) {
    return thumbnail!
  }
  
  // Пытаемся сгенерировать из оригинала
  if (original) {
    const generated = generateOptimizedImageUrls(original, mediaType)
    if (generated?.thumb && isValidThumbnail(generated.thumb)) {
      return generated.thumb
    }
  }
  
  // Fallback на placeholder в зависимости от типа
  switch (mediaType) {
    case 'video':
      return '/placeholder-video-enhanced.png'
    case 'audio':
      return '/placeholder-audio.png'
    default:
      return '/placeholder-image.png'
  }
}

/**
 * Извлекает тип медиа из MIME type или расширения файла
 */
export function getMediaTypeFromFile(file: File | string): 'image' | 'video' | 'audio' | 'unknown' {
  let mimeType = ''
  let fileName = ''
  
  if (typeof file === 'string') {
    fileName = file
    // Определяем по расширению
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) {
        return 'image'
      }
      if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
        return 'video'
      }
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
        return 'audio'
      }
    }
  } else {
    mimeType = file.type
    fileName = file.name
  }
  
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  
  return 'unknown'
}

/**
 * Проверяет и исправляет thumbnail пути в объекте поста
 */
export function fixPostThumbnails(post: any): any {
  if (!post) return post
  
  const mediaType = post.type || getMediaTypeFromFile(post.mediaUrl || '')
  const safeThumbnail = getSafeThumbnail(post.thumbnail, post.mediaUrl, mediaType)
  
  return {
    ...post,
    thumbnail: safeThumbnail
  }
} 