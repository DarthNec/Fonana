import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

const prisma = new PrismaClient()

// POST /api/follow - подписаться на пользователя
export async function POST(request: NextRequest) {
  try {
    console.log('[API/follow] Starting follow request...')
    
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { followingId } = await request.json()
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь не пытается подписаться на себя
    if (user.id === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
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
          followerId: user.id,
          followingId: followingId
        }
      }
    })
    
    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
    }
    
    // Создаем подписку
    const follow = await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: followingId
      }
    })
    
    console.log('[API/follow] Follow created:', follow.id)
    
    // Обновляем счетчики
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
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
    console.error('[API/follow] Error:', error)
    return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
  }
}

// DELETE /api/follow - отписаться от пользователя
export async function DELETE(request: NextRequest) {
  try {
    console.log('[API/follow] Starting unfollow request...')
    
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { followingId } = await request.json()
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, подписаны ли
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: followingId
        }
      }
    })
    
    if (!existingFollow) {
      return NextResponse.json({ error: 'Not following this user' }, { status: 400 })
    }
    
    // Удаляем подписку
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: followingId
        }
      }
    })
    
    console.log('[API/follow] Follow deleted')
    
    // Обновляем счетчики
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { followingCount: { decrement: 1 } }
      }),
      prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { decrement: 1 } }
      })
    ])
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user'
    })
    
  } catch (error) {
    console.error('[API/follow] Error:', error)
    return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
  }
}

// GET /api/follow - проверить статус подписки
export async function GET(request: NextRequest) {
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const followingId = searchParams.get('followingId')
    
    if (!followingId) {
      return NextResponse.json({ error: 'Following ID is required' }, { status: 400 })
    }
    
    // Проверяем, подписаны ли
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: decoded.userId,
          followingId: followingId
        }
      }
    })
    
    return NextResponse.json({ 
      isFollowing: !!existingFollow,
      follow: existingFollow
    })
    
  } catch (error) {
    console.error('[API/follow] Error:', error)
    return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 })
  }
} 