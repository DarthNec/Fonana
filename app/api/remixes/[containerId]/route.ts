import { NextRequest, NextResponse } from 'next/server'
import { getRemixFromFile } from '@/lib/remixFileSystem'

/**
 * GET /api/remixes/[containerId] - получить все ремиксы по containerId из файловой системы
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const { containerId } = params
    
    console.log('[API /remixes] Getting remixes for container:', containerId)
    
    // Получаем данные из файла
    const remixData = await getRemixFromFile(containerId)
    
    if (!remixData) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Remix chain not found',
          containerId 
        },
        { status: 404 }
      )
    }
    
    console.log('[API /remixes] ✅ Found remix chain:', {
      containerId,
      postsCount: remixData.posts.length,
      createdAt: remixData.createdAt,
      updatedAt: remixData.updatedAt
    })
    
    return NextResponse.json({
      success: true,
      data: {
        containerId: remixData.containerId,
        posts: remixData.posts,
        postsCount: remixData.posts.length,
        createdAt: remixData.createdAt,
        updatedAt: remixData.updatedAt
      }
    })
    
  } catch (error) {
    console.error('[API /remixes] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get remix chain',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

