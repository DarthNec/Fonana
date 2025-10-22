import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/follow/mobile - подписаться на пользователя (мобильная версия без JWT)
export async function POST(request: Request) {
  try {
    console.log('[API/follow/mobile] Starting follow request...')
    
    const { userId, followingId } = await request.json()
    
    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Проверяем, что пользователь не пытается подписаться на себя
    if (userId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }
    
    // Получаем пользователя (подписчик)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь, на которого подписываемся, существует
    const followingUser = await prisma.user.findUnique({
      where: { id: followingId }
    })
    
    if (!followingUser) {
      return NextResponse.json({ error: 'User to follow not found' }, { status: 404 })
    }
    
    // Проверяем, не подписаны ли уже
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    })
    
    if (existingFollow) {
      // Если уже подписаны, просто возвращаем успех
      console.log('[API/follow/mobile] Already following, returning existing')
      return NextResponse.json({ 
        success: true,
        follow: existingFollow,
        message: 'Already following this user'
      })
    }
    
    // Создаем подписку
    const follow = await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: followingId
      }
    })
    
    console.log('[API/follow/mobile] Follow created:', follow.id)
    
    // Обновляем счетчики
    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { followingCount: { increment: 1 } }
      }),
      prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { increment: 1 } }
      })
    ])
    
    return NextResponse.json({ 
      success: true,
      follow,
      message: 'Successfully followed user'
    })
    
  } catch (error) {
    console.error('[API/follow/mobile] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to follow user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/follow/mobile - отписаться от пользователя (мобильная версия без JWT)
export async function DELETE(request: Request) {
  try {
    console.log('[API/follow/mobile] Starting unfollow request...')
    
    const { userId, followingId } = await request.json()
    
    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, подписаны ли
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    })
    
    if (!existingFollow) {
      // Если не подписаны, просто возвращаем успех
      console.log('[API/follow/mobile] Not following, returning success')
      return NextResponse.json({ 
        success: true,
        message: 'Not following this user'
      })
    }
    
    // Удаляем подписку
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    })
    
    console.log('[API/follow/mobile] Follow deleted')
    
    // Обновляем счетчики (с проверкой на отрицательные значения)
    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { 
          followingCount: {
            decrement: 1
          }
        }
      }).then(async (updated) => {
        // Исправляем отрицательные значения
        if (updated.followingCount < 0) {
          await prisma.user.update({
            where: { id: userId },
            data: { followingCount: 0 }
          })
        }
      }),
      prisma.user.update({
        where: { id: followingId },
        data: { 
          followersCount: {
            decrement: 1
          }
        }
      }).then(async (updated) => {
        // Исправляем отрицательные значения
        if (updated.followersCount < 0) {
          await prisma.user.update({
            where: { id: followingId },
            data: { followersCount: 0 }
          })
        }
      })
    ])
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user'
    })
    
  } catch (error) {
    console.error('[API/follow/mobile] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to unfollow user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/follow/mobile?userId=xxx&followingId=yyy - проверить статус подписки
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const followingId = searchParams.get('followingId')
    
    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Проверяем, подписаны ли
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      isFollowing: !!existingFollow,
      follow: existingFollow
    })
    
  } catch (error) {
    console.error('[API/follow/mobile] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to check follow status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

