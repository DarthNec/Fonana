export function transformMediaUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.jpg';
  
  // Check if it's a Supabase URL
  if (url.includes('supabase.co/storage')) {
    // Extract filename from Supabase URL
    const match = url.match(/\/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i);
    if (match) {
      const filename = match[1];
      // Return local path
      return `/posts/images/${filename}`;
    }
    
    // Extract from thumb_ pattern in nested path
    const thumbMatch = url.match(/thumb_([a-f0-9]+)\.(webp|jpg)/i);
    if (thumbMatch) {
      return `/posts/images/thumb_${thumbMatch[1]}.${thumbMatch[2]}`;
    }
  }
  
  // Return original URL if not Supabase
  return url;
}

export function getImageWithFallback(url: string | null | undefined): string {
  const transformed = transformMediaUrl(url);
  // Browser will handle fallback via onError
  return transformed;
} 