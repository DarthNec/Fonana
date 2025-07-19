// [post_type_detection_fix_2025_017] Автоматическое определение типа поста
export type PostType = 'text' | 'image' | 'video' | 'audio'

/**
 * Автоматически определяет тип поста на основе mediaUrl
 * @param mediaUrl - URL медиа файла
 * @param fallbackType - резервный тип если автоматическое определение не удалось
 * @returns PostType
 */
export function detectPostType(mediaUrl?: string | null, fallbackType: PostType = 'text'): PostType {
  if (!mediaUrl) return fallbackType
  
  // Нормализуем URL и получаем расширение файла
  const url = mediaUrl.toLowerCase()
  
  // Определяем тип по расширению файла
  if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)) {
    return 'image'
  }
  
  if (url.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?.*)?$/i)) {
    return 'video'
  }
  
  if (url.match(/\.(mp3|wav|m4a|ogg|flac|aac|wma)(\?.*)?$/i)) {
    return 'audio'
  }
  
  // Если тип не определен, возвращаем fallback
  return fallbackType
}

/**
 * Проверяет нужно ли исправить тип поста
 * @param currentType - текущий тип в БД
 * @param mediaUrl - URL медиа файла
 * @returns true если тип нужно исправить
 */
export function shouldFixPostType(currentType: string, mediaUrl?: string | null): boolean {
  if (!mediaUrl) return false
  
  const detectedType = detectPostType(mediaUrl)
  return currentType !== detectedType && detectedType !== 'text'
}

/**
 * Создает SQL для массового исправления типов постов
 * @returns SQL запрос для UPDATE
 */
export function generateFixPostTypesSQL(): string {
  return `
UPDATE posts 
SET type = CASE 
  -- Image files
  WHEN "mediaUrl" IS NOT NULL AND LOWER("mediaUrl") ~ '\\.(jpg|jpeg|png|gif|webp|bmp|svg)(\\?.*)?$' THEN 'image'
  -- Video files  
  WHEN "mediaUrl" IS NOT NULL AND LOWER("mediaUrl") ~ '\\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\\?.*)?$' THEN 'video'
  -- Audio files
  WHEN "mediaUrl" IS NOT NULL AND LOWER("mediaUrl") ~ '\\.(mp3|wav|m4a|ogg|flac|aac|wma)(\\?.*)?$' THEN 'audio'
  -- Keep existing type if no media or unknown format
  ELSE type
END
WHERE "mediaUrl" IS NOT NULL 
  AND (
    (LOWER("mediaUrl") ~ '\\.(jpg|jpeg|png|gif|webp|bmp|svg)(\\?.*)?$' AND type != 'image') OR
    (LOWER("mediaUrl") ~ '\\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\\?.*)?$' AND type != 'video') OR
    (LOWER("mediaUrl") ~ '\\.(mp3|wav|m4a|ogg|flac|aac|wma)(\\?.*)?$' AND type != 'audio')
  );
  `
} 