import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const headersList = headers()
    const userWallet = headersList.get('x-user-wallet')
    
    // Получаем пользователей с кошельками
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { wallet: { not: null } },
          { solanaWallet: { not: null } }
        ]
      },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        wallet: true,
        solanaWallet: true,
        isCreator: true,
        referrerId: true,
        referrer: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
            solanaWallet: true
          }
        },
        _count: {
          select: {
            posts: true,
            subscribers: true
          }
        }
      },
      orderBy: [
        { isCreator: 'desc' },
        { nickname: 'asc' }
      ],
      take: 50 // Ограничиваем для тестов
    })
    
    // Форматируем данные
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      nickname: user.nickname || 'Unknown',
      fullName: user.fullName,
      wallet: user.wallet || user.solanaWallet || null,
      isCreator: user.isCreator,
      postsCount: user._count.posts,
      subscribersCount: user._count.subscribers,
      referrer: user.referrer ? {
        id: user.referrer.id,
        nickname: user.referrer.nickname || 'Unknown',
        wallet: user.referrer.wallet || user.referrer.solanaWallet || null
      } : null
    }))
    
    // Добавляем текущего пользователя в начало, если он есть
    if (userWallet) {
      const currentUser = await prisma.user.findFirst({
        where: {
          OR: [
            { wallet: userWallet },
            { solanaWallet: userWallet }
          ]
        },
        include: {
          referrer: true
        }
      })
      
      if (currentUser) {
        const currentUserFormatted = {
          id: currentUser.id,
          nickname: currentUser.nickname || 'You',
          fullName: currentUser.fullName,
          wallet: currentUser.wallet || currentUser.solanaWallet,
          isCreator: currentUser.isCreator,
          postsCount: 0,
          subscribersCount: 0,
          referrer: currentUser.referrer ? {
            id: currentUser.referrer.id,
            nickname: currentUser.referrer.nickname || 'Unknown',
            wallet: currentUser.referrer.wallet || currentUser.referrer.solanaWallet || null
          } : null,
          isCurrent: true
        }
        
        // Убираем текущего пользователя из списка если он там есть
        const filteredUsers = formattedUsers.filter((u: any) => u.id !== currentUser.id)
        
        return NextResponse.json({
          currentUser: currentUserFormatted,
          users: filteredUsers,
          total: filteredUsers.length + 1
        })
      }
    }
    
    return NextResponse.json({
      currentUser: null,
      users: formattedUsers,
      total: formattedUsers.length
    })
    
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
} 