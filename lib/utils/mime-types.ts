/**
 * Utility to determine MIME type from file path
 */
export function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    
    // Documents
    'pdf': 'application/pdf',
    'json': 'application/json',
    'xml': 'application/xml',
    'txt': 'text/plain',
    
    // Default
    'bin': 'application/octet-stream'
  }
  
  return mimeTypes[ext || ''] || 'application/octet-stream'
} 