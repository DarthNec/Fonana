import { NextRequest, NextResponse } from 'next/server'
import { checkMediaAccess } from '@/lib/services/media-access'
import { getContentType } from '@/lib/utils/mime-types'
import { createReadStream, existsSync, statSync } from 'fs'
import { Readable } from 'stream'
import path from 'path'

// Development fallback when Nginx is not available
async function streamFile(filePath: string, headers: Headers): Promise<NextResponse> {
  const stream = createReadStream(filePath)
  const webStream = Readable.toWeb(stream) as ReadableStream
  
  return new NextResponse(webStream, { headers })
}

// NEW: Enhanced file streaming with headers for production restricted content
async function streamFileWithHeaders(
  filePath: string,
  headers: Headers,
  accessResult: any,
  request: NextRequest
): Promise<NextResponse> {
  
  if (!existsSync(filePath)) {
    console.log('[Media API] File not found for direct streaming:', filePath)
    return new NextResponse('Not found', { status: 404 })
  }

  const stats = statSync(filePath)
  const contentType = getContentType(filePath)
  
  console.log('[Media API] Direct streaming with headers:', {
    path: filePath,
    size: stats.size,
    accessType: accessResult.accessType,
    hasAccess: accessResult.hasAccess
  })
  
  // Enhanced headers for direct streaming
  headers.set('Content-Type', contentType)
  headers.set('Content-Length', String(stats.size))
  headers.set('Last-Modified', stats.mtime.toUTCString())
  headers.set('ETag', `"${stats.mtime.getTime()}-${stats.size}"`)
  headers.set('Accept-Ranges', 'bytes')
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Conditional caching based on access
  if (accessResult.hasAccess) {
    headers.set('Cache-Control', 'public, max-age=604800') // 7 days for accessible content
  } else {
    headers.set('Cache-Control', 'private, max-age=300') // 5 min for restricted (может поменяться при подписке)
  }
  
  // Handle range requests for video streaming
  const range = request.headers.get('range')
  if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
    const chunksize = (end - start) + 1
    
    headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
    headers.set('Content-Length', String(chunksize))
    
    const stream = createReadStream(filePath, { start, end, highWaterMark: 64 * 1024 })
    const webStream = Readable.toWeb(stream) as ReadableStream
    
    return new NextResponse(webStream, { 
      status: 206, // Partial Content
      headers 
    })
  }
  
  // Regular file streaming with controlled chunks
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 }) // 64KB chunks
  const webStream = Readable.toWeb(stream) as ReadableStream
  return new NextResponse(webStream, { headers })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const mediaPath = params.path.join('/')
  
  // Security check
  if (mediaPath.includes('..') || mediaPath.includes('~')) {
    return new NextResponse('Invalid path', { status: 400 })
  }
  
  console.log('[Media API] Request for:', mediaPath)
  
  // Get auth token from header or query (для Next Image compatibility)
  const authHeader = request.headers.get('authorization')
  const queryToken = request.nextUrl.searchParams.get('token')
  const token = authHeader?.replace('Bearer ', '') || queryToken || null
  
  // Check access (получаем metadata, НЕ блокируем доступ!)
  const access = await checkMediaAccess(mediaPath, token)
  
  console.log('[Media API] Access check result:', {
    path: mediaPath,
    hasAccess: access.hasAccess,
    shouldBlur: access.shouldBlur,
    accessType: access.accessType
  })
  
  // Create headers with all metadata
  const headers = new Headers({
    // Content headers
    'Content-Type': getContentType(mediaPath),
    'Content-Disposition': 'inline',
    
    // ВАЖНО: Metadata для frontend blur system
    'X-Has-Access': String(access.hasAccess),
    'X-Should-Blur': String(access.shouldBlur),
    'X-Should-Dim': String(access.shouldDim),
    'X-Upgrade-Prompt': access.upgradePrompt || '',
    'X-Required-Tier': access.requiredTier || '',
    'X-Access-Type': access.accessType || 'free',
    'X-Price': access.price ? String(access.price) : '0',
    'X-Currency': access.currency || 'SOL',
    
    // CORS headers для cross-origin requests
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Has-Access, X-Should-Blur, X-Should-Dim, X-Upgrade-Prompt, X-Required-Tier, X-Access-Type'
  })

  // Find file path for both dev and production
  const publicPath = path.join(process.cwd(), 'public', mediaPath)
  const storagePath = path.join(process.cwd(), 'storage/media', mediaPath)
  
  let filePath: string | null = null
  if (existsSync(publicPath)) {
    filePath = publicPath
  } else if (existsSync(storagePath)) {
    filePath = storagePath
  }
  
  // DEVELOPMENT FALLBACK: Stream file directly when not in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Media API] Development mode - streaming file directly')
    
    if (!filePath) {
      console.log('[Media API] File not found in:', { publicPath, storagePath })
      return new NextResponse('Not found', { status: 404 })
    }
    
    console.log('[Media API] Streaming file from:', filePath)
    
    // Add file stats to headers
    try {
      const stats = statSync(filePath)
      headers.set('Content-Length', String(stats.size))
      headers.set('Last-Modified', stats.mtime.toUTCString())
      
      // Handle range requests for video
      const range = request.headers.get('range')
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
        const chunksize = (end - start) + 1
        
        headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Length', String(chunksize))
        
        const stream = createReadStream(filePath, { start, end })
        const webStream = Readable.toWeb(stream) as ReadableStream
        
        return new NextResponse(webStream, { 
          status: 206,
          headers 
        })
      }
    } catch (error) {
      console.error('[Media API] Error getting file stats:', error)
    }
    
    // Stream the file
    return streamFile(filePath, headers)
  }
  
  // PRODUCTION: CONDITIONAL X-ACCEL LOGIC
  console.log('[Media API] Production mode - conditional serving')
  
  // NEW: Intelligent routing based on content type and access
  if (access.hasAccess && access.accessType === 'free') {
    // Free content with access → X-Accel for maximum performance
    console.log('[Media API] Free content - using X-Accel-Redirect for optimal performance')
    headers.set('X-Accel-Redirect', `/internal/${mediaPath}`)
    headers.set('X-Debug-Path', 'x-accel-redirect')
    return new NextResponse(null, { headers })
  } else {
    // Restricted/Premium content → Direct streaming to preserve headers
    // ВАЖНО: НЕ устанавливаем X-Accel-Redirect для restricted content!
    console.log('[Media API] Restricted content - direct streaming to preserve headers')
    headers.set('X-Debug-Path', 'direct-streaming')
    
    if (!filePath) {
      console.log('[Media API] File not found for restricted content:', { publicPath, storagePath })
      return new NextResponse('Not found', { status: 404 })
    }
    
    return streamFileWithHeaders(filePath, headers, access, request)
  }
}

// OPTIONS для CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Expose-Headers': 'X-Has-Access, X-Should-Blur, X-Should-Dim, X-Upgrade-Prompt, X-Required-Tier, X-Access-Type'
    }
  })
} 