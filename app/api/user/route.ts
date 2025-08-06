import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, getUserByWallet, updateUserProfile, deleteUser, prisma } from '@/lib/db'
import { generateRandomNickname, generateRandomBio, generateFullNameFromNickname } from '@/lib/usernames'
import { referralLogger, apiLogger } from '@/lib/utils/logger'

// Отключаем кеширование для этого route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/user?wallet=ADDRESS или /api/user?id=ID или /api/user?nickname=NICKNAME - получить пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const wallet = searchParams.get('wallet')
    const id = searchParams.get('id')
    const nickname = searchParams.get('nickname')

    if (!wallet && !id && !nickname) {
      return NextResponse.json({ error: 'Wallet address, ID or nickname required' }, { status: 400 })
    }

    let user
    if (id) {
      // Валидация ID (защита от инъекций)
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
      }
      
      // Получаем пользователя по ID
      user = await prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
    } else if (nickname) {
      // Валидация nickname (защита от инъекций)
      if (!/^[a-zA-Z0-9_.-]+$/.test(nickname)) {
        return NextResponse.json({ error: 'Invalid nickname format' }, { status: 400 })
      }
      
      // Получаем пользователя по никнейму (case-insensitive)
      user = await prisma.user.findFirst({
        where: { 
          nickname: {
            equals: nickname,
            mode: 'insensitive' // Case-insensitive поиск
          }
        },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
    } else if (wallet) {
      // Валидация wallet (защита от инъекций)
      if (!/^[a-zA-Z0-9]+$/.test(wallet)) {
        return NextResponse.json({ error: 'Invalid wallet format' }, { status: 400 })
      }
      
      console.log('🎯 [API USER] Searching for user with wallet:', wallet)
      
      // Получаем пользователя по wallet с полной информацией
      // 🔥 ИСПРАВЛЕНО: Добавлен поиск по solanaWallet
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { wallet: wallet },
            { solanaWallet: wallet } // 🔥 ВОССТАНОВЛЕНО: Поиск по solanaWallet
          ]
        },
        include: {
          _count: {
            select: {
              posts: true,
              followers: true,
              follows: true,
            },
          },
        },
      })
      
      console.log('🎯 [API USER] Search result:', {
        found: !!user,
        userId: user?.id,
        userWallet: user?.wallet,
        userSolanaWallet: user?.solanaWallet,
        userNickname: user?.nickname
      })
    }
    
    if (!user) {
      console.log('🎯 [API USER] User not found, creating new user with wallet:', wallet)
      
      try {
        // Создаем нового пользователя
        user = await prisma.user.create({
          data: {
            wallet: wallet!,
            nickname: `user_${wallet!.slice(0, 8).toLowerCase()}`,
            solanaWallet: wallet!
          },
          include: {
            _count: {
              select: {
                posts: true,
                followers: true,
                follows: true,
              },
            },
          },
        })
        
        console.log('🎯 [API USER] New user created successfully:', {
          userId: user.id,
          userWallet: user.wallet,
          userSolanaWallet: user.solanaWallet,
          userNickname: user.nickname
        })
      } catch (error) {
        console.error('🎯 [API USER] Failed to create user:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    }

    const response = NextResponse.json({ user })
    // Добавляем заголовки для предотвращения кеширования
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user - создать или обновить пользователя при подключении кошелька
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, referrerFromClient } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Сначала проверяем, существует ли пользователь
    const existingUser = await getUserByWallet(wallet)
    
    if (existingUser) {
      // Проверяем, есть ли у пользователя никнейм и полное имя
      // bio является опциональным полем и может быть пустым
      const isProfileEmpty = !existingUser.nickname || !existingUser.fullName
      
      // Пользователь существует - возвращаем его
      const response = NextResponse.json({ 
        user: existingUser,
        isNewUser: isProfileEmpty // Показываем модалку если профиль пустой
      })
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      return response
    }
    
    // Проверяем cookie с реферером
    const referrerCookie = request.cookies.get('fonana_referrer')
    let referrerNickname = referrerCookie?.value
    
    // Fallback на реферера из клиента (localStorage)
    if (!referrerNickname && referrerFromClient) {
      referrerNickname = referrerFromClient
      referralLogger.info('Using referrer from localStorage fallback', {
        referrer: referrerNickname,
        wallet: wallet.slice(0, 8) + '...'
      })
    }
    
    if (referrerNickname) {
      referralLogger.info('Creating user with referrer', {
        referrer: referrerNickname,
        wallet: wallet.slice(0, 8) + '...',
        source: referrerCookie ? 'cookie' : 'localStorage'
      })
    } else {
      referralLogger.info('Creating user without referrer', {
        wallet: wallet.slice(0, 8) + '...'
      })
    }
    
    // Создаем нового пользователя БЕЗ автоматической генерации данных
    // Пользователь сам заполнит профиль через модалку
    const newUser = await createOrUpdateUser(wallet, {
      // Оставляем пустые поля, чтобы пользователь заполнил их сам
      nickname: undefined,
      fullName: undefined,
      bio: undefined
    }, referrerNickname)
    
    const response = NextResponse.json({ 
      user: newUser,
      isNewUser: true // Новый пользователь всегда должен увидеть модалку
    })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
  } catch (error) {
    console.error('Error creating/updating user:', error)
    apiLogger.error('Failed to create/update user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      wallet: request.body ? JSON.parse(await request.text()).wallet : 'unknown'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user - обновить профиль пользователя
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, ...profileData } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const user = await updateUserProfile(wallet, profileData)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user - удалить аккаунт пользователя
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    await deleteUser(wallet)

    return NextResponse.json({ success: true, message: 'User account deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 