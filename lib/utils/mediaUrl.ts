export function transformMediaUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.jpg';
  
  console.log('[transformMediaUrl] Processing URL:', url);
  
  // 🔧 КРИТИЧЕСКИЙ ФИКС: обработка старых JPG путей
  if (url.includes('/media/tests/posts/') && (url.endsWith('.jpg') || url.endsWith('.JPG'))) {
    console.warn('[transformMediaUrl] Converting old test JPG to placeholder:', url);
    return '/placeholder.jpg'; // Используем placeholder для старых test images
  }
  
  // 🔧 НОВЫЙ ФИКС: обработка URL от BunnyStorage (ПЕРВЫМ!)
  if (url.includes('b-cdn.net') || url.includes('storage.bunnycdn.com')) {
    console.log('[transformMediaUrl] Processing BunnyStorage URL:', url);
    // Возвращаем URL как есть - это уже полный CDN URL
    return url;
  }
  
  // 🔧 ФИКС: конвертация JPG путей в posts/images в WebP (только для локальных файлов)
  if (url.includes('/posts/images/') && (url.endsWith('.jpg') || url.endsWith('.JPG'))) {
    const webpUrl = url.replace(/\.(jpg|JPG)$/, '.webp');
    console.warn('[transformMediaUrl] Converting JPG to WebP:', url, '->', webpUrl);
    return webpUrl;
  }
  
  // Check if it's a Supabase URL
  if (url.includes('supabase.co/storage')) {
    // Extract filename from Supabase URL
    const match = url.match(/\/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i);
    if (match) {
      const filename = match[1];
      // Convert JPG to WebP for new uploads
      const webpFilename = filename.replace(/\.(jpg|jpeg)$/i, '.webp');
      return `/posts/images/${webpFilename}`;
    }
    
    // Extract from thumb_ pattern in nested path
    const thumbMatch = url.match(/thumb_([a-f0-9]+)\.(webp|jpg)/i);
    if (thumbMatch) {
      // Always use WebP for thumbnails
      return `/posts/images/thumb_${thumbMatch[1]}.webp`;
    }
  }
  
  // Return original URL if not problematic
  return url;
}

export function getImageWithFallback(url: string | null | undefined): string {
  const transformed = transformMediaUrl(url);
  // Browser will handle fallback via onError
  return transformed;
} 