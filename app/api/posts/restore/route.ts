import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'
import { restoreDeletedPost } from '@/lib/utils/deletedPosts'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/restore?userId=xxx
 * Получить количество удалённых постов пользователя
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

    // Получаем количество удалённых постов пользователя
    // TODO: После применения миграции и запуска `npx prisma generate` эта строка заработает
    const count = await prisma.deletedPost.count({
      where: { creatorId: userId }
    })

    return NextResponse.json({
      success: true,
      userId,
      count
    })
  } catch (error: any) {
    console.error('❌ [RESTORE API] Error getting deleted posts count:', error)
    return NextResponse.json(
      { error: 'Failed to get deleted posts count', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts/restore
 * Восстановление удалённого поста
 * 
 * Body:
 * {
 *   "deletedPostId": "string",
 *   "userWallet": "string"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deletedPostId, userWallet } = body

    if (!deletedPostId || !userWallet) {
      return NextResponse.json(
        { error: 'deletedPostId and userWallet are required' }, 
        { status: 400 }
      )
    }

    // Получаем пользователя
    const user = await getUserByWallet(userWallet)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что удалённый пост существует и принадлежит пользователю
    // TODO: После применения миграции и запуска `npx prisma generate` эта строка заработает
    const deletedPost = await prisma.deletedPost.findUnique({
      where: { id: deletedPostId },
      select: { id: true, creatorId: true, originalPostId: true, title: true }
    })

    if (!deletedPost) {
      return NextResponse.json({ error: 'Deleted post not found' }, { status: 404 })
    }

    // Проверяем, что пользователь - автор поста или админ
    // TODO: Добавить проверку на админа через user.isAdmin
    if (deletedPost.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to restore this post' }, 
        { status: 403 }
      )
    }

    // Восстанавливаем пост
    console.log('🔄 [RESTORE API] Restoring post:', deletedPostId)
    const restoredPost = await restoreDeletedPost({
      deletedPostId,
      restoreRelations: false // TODO: В будущем можно добавить восстановление связей
    })

    console.log('✅ [RESTORE API] Post restored successfully:', restoredPost.id)

    return NextResponse.json({
      success: true,
      message: 'Post restored successfully',
      post: {
        id: restoredPost.id,
        title: restoredPost.title,
        creatorId: restoredPost.creatorId
      }
    })
  } catch (error: any) {
    console.error('❌ [RESTORE API] Error restoring post:', error)
    
    // Специальная обработка для случая, когда пост уже существует
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Post with this ID already exists. Cannot restore.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to restore post', details: error.message },
      { status: 500 }
    )
  }
}
