import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      )
    }

    // Получаем информацию о создателе включая реферера
    const creator = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        fullName: true,
        bio: true,
        avatar: true,
        backgroundImage: true,
        website: true,
        twitter: true,
        telegram: true,
        location: true,
        isVerified: true,
        isCreator: true,
        followersCount: true,
        followingCount: true,
        postsCount: true,
        wallet: true,
        solanaWallet: true,
        referrerId: true,
        referrer: {
          select: {
            id: true,
            name: true,
            nickname: true,
            wallet: true,
            solanaWallet: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Форматируем ответ
    const formattedCreator = {
      ...creator,
      createdAt: creator.createdAt.toISOString(),
      updatedAt: creator.updatedAt.toISOString()
    }

    return NextResponse.json({ creator: formattedCreator })

  } catch (error) {
    console.error('Error fetching creator:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creator' },
      { status: 500 }
    )
  }
} 