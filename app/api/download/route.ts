import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Получаем URL из query параметра
    const fileUrl = request.nextUrl.searchParams.get('url')
    
    if (!fileUrl) {
      return new NextResponse('URL parameter is required', { status: 400 })
    }

    // Проверяем что URL валидный
    let url: URL
    try {
      url = new URL(fileUrl)
    } catch {
      return new NextResponse('Invalid URL', { status: 400 })
    }

    // Дополнительная проверка безопасности - только разрешенные домены
    const allowedDomains = [
      'fonanastorage.b-cdn.net',
      'fonana.b-cdn.net',
      // Добавьте другие разрешенные домены если нужно
    ]
    
    if (!allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
      return new NextResponse('Domain not allowed', { status: 403 })
    }

    console.log('[Download API] Fetching file:', fileUrl)

    // Скачиваем файл с CDN
    const response = await fetch(fileUrl)
    
    if (!response.ok) {
      console.error('[Download API] Failed to fetch file:', response.status, response.statusText)
      return new NextResponse('Failed to fetch file', { status: response.status })
    }

    // Получаем имя файла из URL
    const fileName = decodeURIComponent(fileUrl.split("/").pop() || "video.mp4")

    // Получаем тип контента
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // Получаем размер файла если доступен
    const contentLength = response.headers.get('content-length')

    // Создаем заголовки для скачивания
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-cache',
    })

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    console.log('[Download API] Streaming file:', {
      fileName,
      contentType,
      contentLength
    })

    // Возвращаем поток данных
    return new NextResponse(response.body, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('[Download API] Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// OPTIONS для CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}


