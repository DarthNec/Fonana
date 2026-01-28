import { NextResponse } from 'next/server'

export async function GET() {
  const version = process.env.NEXT_PUBLIC_MOBILE_APP_VERSION || '1.0.0'
  
  return NextResponse.json({
    version: version,
    timestamp: new Date().toISOString(),
    buildId: process.env.BUILD_ID || 'development'
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}

