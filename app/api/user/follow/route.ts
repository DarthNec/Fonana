import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/user/follow
 * Получить список фолловеров или подписок пользователя
 * 
 * Query params:
 * - userId: string (required) - ID пользователя
 * - type: 'followers' | 'following' (required)
 *   - followers: возвращает всех, кто подписан на userId
 *   - following: возвращает всех, на кого подписан userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    console.log('[API/user/follow] GET request:', { userId, type })

    // Валидация параметров
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!type || (type !== 'followers' && type !== 'following')) {
      return NextResponse.json(
        { success: false, error: 'type must be "followers" or "following"' },
        { status: 400 }
      )
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (type === 'followers') {
      // Получаем всех, кто подписан на userId (followingId = userId)
      const follows = await prisma.follow.findMany({
        where: {
          followingId: userId
        },
        include: {
          follower: {
            select: {
              id: true,
              nickname: true,
              fullName: true,
              avatar: true,
              isVerified: true,
              bio: true,
              followersCount: true,
              followingCount: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const followers = follows.map(follow => ({
        id: follow.id,
        userId: follow.follower.id,
        user: {
          id: follow.follower.id,
          nickname: follow.follower.nickname,
          fullName: follow.follower.fullName,
          avatar: follow.follower.avatar,
          isVerified: follow.follower.isVerified,
          bio: follow.follower.bio,
          followersCount: follow.follower.followersCount,
          followingCount: follow.follower.followingCount
        },
        createdAt: follow.createdAt.toISOString()
      }))

      console.log('[API/user/follow] Found followers:', followers.length)

      return NextResponse.json({
        success: true,
        type: 'followers',
        count: followers.length,
        data: followers
      })

    } else {
      // Получаем всех, на кого подписан userId (followerId = userId)
      const follows = await prisma.follow.findMany({
        where: {
          followerId: userId
        },
        include: {
          following: {
            select: {
              id: true,
              nickname: true,
              fullName: true,
              avatar: true,
              isVerified: true,
              bio: true,
              followersCount: true,
              followingCount: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const following = follows.map(follow => ({
        id: follow.id,
        userId: follow.following.id,
        user: {
          id: follow.following.id,
          nickname: follow.following.nickname,
          fullName: follow.following.fullName,
          avatar: follow.following.avatar,
          isVerified: follow.following.isVerified,
          bio: follow.following.bio,
          followersCount: follow.following.followersCount,
          followingCount: follow.following.followingCount
        },
        createdAt: follow.createdAt.toISOString()
      }))

      console.log('[API/user/follow] Found following:', following.length)

      return NextResponse.json({
        success: true,
        type: 'following',
        count: following.length,
        data: following
      })
    }

  } catch (error) {
    console.error('[API/user/follow] GET Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

