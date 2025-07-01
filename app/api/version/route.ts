import { APP_VERSION } from '@/lib/version'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
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