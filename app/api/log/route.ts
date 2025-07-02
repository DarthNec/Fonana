import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Логируем debug информацию
    console.log('[API][Debug] Race condition debug:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ...body
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API][Debug] Error logging debug info:', error)
    return NextResponse.json({ success: false, error: 'Failed to log debug info' }, { status: 500 })
  }
} 