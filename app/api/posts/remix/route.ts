import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userWallet,
      title,
      content,
      type,
      category,
      tags,
      thumbnail,
      mediaUrl,
      requestId,
      isLocked,
      accessType,
      originalPostId,
      remixPrompt,
      originalVideoUrl
    } = body

    console.log('[API /posts/remix] Creating remix post:', {
      userWallet,
      title,
      originalPostId,
      remixPrompt
    })

    // Проверяем, что пользователь существует
    const user = await prisma.user.findFirst({
      where: {
        wallet: userWallet
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, что оригинальный пост существует
    const originalPost = await prisma.post.findUnique({
      where: {
        id: originalPostId
      }
    })

    if (!originalPost) {
      return NextResponse.json(
        { error: 'Original post not found' },
        { status: 404 }
      )
    }

    // Создаем новый пост-ремикс
    const remixPost = await prisma.post.create({
      data: {
        creatorId: user.id,
        title,
        content,
        type,
        category,
        thumbnail,
        mediaUrl,
        requestId,
        isLocked,
        minSubscriptionTier: accessType === 'vip' ? 'vip' : 
                            accessType === 'premium' ? 'premium' :
                            accessType === 'subscribers' ? 'basic' : 
                            null,
        // Используем поле remixId для связи с оригинальным постом
        remixId: originalPostId
      }
    })

    console.log('[API /posts/remix] Remix post created:', remixPost.id)

    // Возвращаем созданный пост
    return NextResponse.json({
      success: true,
      post: {
        id: remixPost.id,
        title: remixPost.title,
        content: remixPost.content,
        type: remixPost.type,
        category: remixPost.category,
        thumbnail: remixPost.thumbnail,
        mediaUrl: remixPost.mediaUrl,
        requestId: remixPost.requestId,
        isLocked: remixPost.isLocked,
        minSubscriptionTier: remixPost.minSubscriptionTier,
        remixId: remixPost.remixId,
        createdAt: remixPost.createdAt,
        updatedAt: remixPost.updatedAt
      }
    })

  } catch (error) {
    console.error('[API /posts/remix] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
