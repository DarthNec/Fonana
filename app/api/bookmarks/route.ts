import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/bookmarks - получить закладки пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')
    
    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }

    // Получаем пользователя по кошельку
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userId = user.id

    // Получаем закладки пользователя с постами
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: userId
      },
      include: {
        post: {
          include: {
            creator: {
              select: {
                id: true,
                nickname: true,
                fullName: true,
                avatar: true,
                isCreator: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Получаем эмоции для постов
    const postIds = bookmarks.map(b => b.post.id)
    const emotions = await (prisma as any).emotion.findMany({
      where: {
        postId: { in: postIds }
      }
    })

    // Группируем эмоции по постам
    const emotionsMap = new Map<string, any[]>()
    emotions.forEach((emotion: any) => {
      if (!emotionsMap.has(emotion.postId)) {
        emotionsMap.set(emotion.postId, [])
      }
      emotionsMap.get(emotion.postId)!.push(emotion)
    })

    // Форматируем посты
    const posts = bookmarks.map(bookmark => {
      const post = bookmark.post
      return {
        ...post,
        creator: {
          ...post.creator,
          name: post.creator.fullName || post.creator.nickname || 'Unknown',
          username: post.creator.nickname || 'unknown',
        },
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        media: {
          type: post.type,
          url: post.mediaUrl,
          thumbnail: post.thumbnail,
          preview: post.previewUrl,
          error: post.error,
          blurUrl: post.blurUrl
        },
        emotions: emotionsMap.get(post.id) || [],
        bookmarkedAt: bookmark.createdAt
      }
    })

    return NextResponse.json({
      success: true,
      bookmarks: posts,
      count: posts.length
    })
  } catch (error) {
    console.error('[API] Bookmarks GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/bookmarks - добавить/удалить закладку (toggle)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userWallet, postId } = body

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }

    // Получаем пользователя по кошельку
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userId = user.id

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      )
    }

    // Проверяем существование поста
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Проверяем наличие закладки
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId
        }
      }
    })

    if (existingBookmark) {
      // Удаляем закладку
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id
        }
      })

      console.log('[API] Bookmark removed:', { userId, postId })

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Bookmark removed successfully'
      })
    } else {
      // Добавляем закладку
      const bookmark = await prisma.bookmark.create({
        data: {
          userId: userId,
          postId: postId
        }
      })

      console.log('[API] Bookmark added:', { userId, postId })

      return NextResponse.json({
        success: true,
        action: 'added',
        message: 'Bookmark added successfully',
        bookmark: bookmark
      })
    }
  } catch (error) {
    console.error('[API] Bookmarks POST error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle bookmark', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

