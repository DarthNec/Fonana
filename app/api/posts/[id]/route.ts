import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/posts/[id] - получить конкретный пост
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            wallet: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Форматируем пост для фронтенда
    const formattedPost = {
      ...post,
      creator: {
        ...post.creator,
        name: post.creator.fullName || post.creator.nickname || 'User',
        username: post.creator.nickname || 'user',
      },
      image: post.mediaUrl || post.thumbnail,
      likes: post._count?.likes || 0,
      comments: post._count?.comments || 0,
      tags: post.tags?.map((t: any) => t.tag.name) || [],
    }

    return NextResponse.json({ post: formattedPost })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

// PUT /api/posts/[id] - обновить пост
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { userWallet, ...updateData } = body

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем пользователя
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что пользователь - автор поста
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { 
        creatorId: true,
        creator: {
          select: {
            id: true,
            wallet: true
          }
        }
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Логирование для отладки
    console.log('[API/posts/[id]] Update attempt - user.id:', user.id, 'post.creatorId:', post.creatorId, 'post.creator.wallet:', post.creator.wallet)

    if (post.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this post' }, { status: 403 })
    }

    // Подготавливаем данные для обновления
    const dataToUpdate: any = {}
    
    // Обновляем только переданные поля
    if (updateData.title !== undefined) dataToUpdate.title = updateData.title
    if (updateData.content !== undefined) dataToUpdate.content = updateData.content
    if (updateData.category !== undefined) dataToUpdate.category = updateData.category
    if (updateData.thumbnail !== undefined) dataToUpdate.thumbnail = updateData.thumbnail
    if (updateData.mediaUrl !== undefined) dataToUpdate.mediaUrl = updateData.mediaUrl
    if (updateData.isLocked !== undefined) dataToUpdate.isLocked = updateData.isLocked
    if (updateData.isPremium !== undefined) dataToUpdate.isPremium = updateData.isPremium
    if (updateData.price !== undefined) dataToUpdate.price = updateData.price
    if (updateData.currency !== undefined) dataToUpdate.currency = updateData.currency
    
    // Обновляем sellable поля
    if (updateData.isSellable !== undefined) dataToUpdate.isSellable = updateData.isSellable
    if (updateData.sellType !== undefined) dataToUpdate.sellType = updateData.sellType
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity
    
    // Обновляем minSubscriptionTier на основе accessType или tier
    if (updateData.minSubscriptionTier !== undefined) {
      dataToUpdate.minSubscriptionTier = updateData.minSubscriptionTier
    } else if (updateData.accessType !== undefined) {
      // Мапим accessType на minSubscriptionTier
      switch (updateData.accessType) {
        case 'free':
          dataToUpdate.minSubscriptionTier = null
          dataToUpdate.isLocked = false
          // Не сбрасываем цену если это sellable пост
          if (!updateData.isSellable) {
            dataToUpdate.price = null
          }
          break
        case 'subscribers':
          dataToUpdate.minSubscriptionTier = 'basic'
          dataToUpdate.isLocked = true
          // Не сбрасываем цену если это sellable пост
          if (!updateData.isSellable) {
            dataToUpdate.price = null
          }
          break
        case 'premium':
          dataToUpdate.minSubscriptionTier = 'premium'
          dataToUpdate.isLocked = true
          // Не сбрасываем цену если это sellable пост
          if (!updateData.isSellable) {
            dataToUpdate.price = null
          }
          break
        case 'vip':
          dataToUpdate.minSubscriptionTier = 'vip'
          dataToUpdate.isLocked = true
          // Не сбрасываем цену если это sellable пост
          if (!updateData.isSellable) {
            dataToUpdate.price = null
          }
          break
        case 'paid':
          dataToUpdate.minSubscriptionTier = null
          dataToUpdate.isLocked = true
          // price остается как есть
          break
      }
    }

    // Обновляем теги если они переданы
    if (updateData.tags !== undefined) {
      // Удаляем старые связи тегов
      await prisma.postTag.deleteMany({
        where: { postId: params.id },
      })

      // Создаем новые связи
      if (updateData.tags.length > 0) {
        dataToUpdate.tags = {
          create: updateData.tags.map((tagName: string) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              },
            },
          })),
        }
      }
    }

    // Обновляем пост
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...dataToUpdate,
        updatedAt: new Date(),
      },
      include: {
        creator: true,
        tags: {
          include: { tag: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    // Форматируем для фронтенда
    const formattedPost = {
      ...updatedPost,
      creator: {
        ...updatedPost.creator,
        name: updatedPost.creator.fullName || updatedPost.creator.nickname || 'User',
        username: updatedPost.creator.nickname || 'user',
      },
      image: updatedPost.mediaUrl || updatedPost.thumbnail,
      likes: updatedPost._count?.likes || 0,
      comments: updatedPost._count?.comments || 0,
      tags: updatedPost.tags?.map((t: any) => t.tag.name) || [],
    }

    return NextResponse.json({ post: formattedPost })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

// DELETE /api/posts/[id] - удалить пост
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем пользователя
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что пользователь - автор поста
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { creatorId: true },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    // Удаляем пост (связанные данные удалятся каскадно)
    await prisma.post.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
} 