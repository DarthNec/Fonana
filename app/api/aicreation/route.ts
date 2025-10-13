import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/aicreation?userId=ID - получить все генерации пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Получаем все генерации пользователя
    const creations = await prisma.aI_Creations.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`[API] Found ${creations.length} AI creations for user:`, userId)

    return NextResponse.json({
      success: true,
      creations
    }, { status: 200 })

  } catch (error) {
    console.error('[API] AI Creation GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI creations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/aicreation - создать новую AI генерацию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, type, requestId, model, size, prompt, status } = body

    // Валидация обязательных полей
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!type || !['photo', 'video'].includes(type)) {
      return NextResponse.json({ error: 'type must be "photo" or "video"' }, { status: 400 })
    }

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    if (!model || !['sora2', 'openAI'].includes(model)) {
      return NextResponse.json({ error: 'model must be "sora2" or "openAI"' }, { status: 400 })
    }

    if (!size) {
      return NextResponse.json({ error: 'size is required' }, { status: 400 })
    }

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    // Создаем запись в базе данных
    const aiCreation = await prisma.aI_Creations.create({
      data: {
        user_id,
        type,
        requestId,
        model,
        size,
        prompt,
        status
      }
    })

    console.log('[API] AI Creation created:', aiCreation.id)

    return NextResponse.json({
      success: true,
      creation: aiCreation
    }, { status: 201 })

  } catch (error) {
    console.error('[API] AI Creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create AI creation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

