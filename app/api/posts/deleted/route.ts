import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/deleted?userId=xxx
 * Получить список удалённых постов пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Получаем удалённые посты пользователя
    // TODO: После применения миграции и запуска `npx prisma generate` эта строка заработает
    const posts = await prisma.deletedPost.findMany({
      where: { creatorId: userId },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        originalPostId: true,
        title: true,
        content: true,
        type: true,
        category: true,
        thumbnail: true,
        mediaUrl: true,
        blurUrl: true,
        previewUrl: true,
        isLocked: true,
        isPremium: true,
        price: true,
        currency: true,
        isSellable: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedBy: true,
        deletionReason: true,
      }
    })

    return NextResponse.json({
      success: true,
      posts
    })
  } catch (error: any) {
    console.error('❌ [DELETED POSTS API] Error getting deleted posts:', error)
    return NextResponse.json(
      { error: 'Failed to get deleted posts', details: error.message },
      { status: 500 }
    )
  }
}
