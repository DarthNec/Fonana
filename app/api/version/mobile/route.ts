import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Получаем последнюю версию из таблицы Versions
    const versionRecord = await prisma.version.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        version: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Если версия не найдена, возвращаем дефолтную
    if (!versionRecord) {
      return NextResponse.json({
        version: '1',
        message: 'No version found in database, returning default',
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    return NextResponse.json({
      version: versionRecord.version,
      createdAt: versionRecord.createdAt,
      updatedAt: versionRecord.updatedAt,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('[API /api/version/mobile] Error fetching version:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch version',
      version: '1', // Fallback версия
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

