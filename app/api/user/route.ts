import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, getUserByWallet, updateUserProfile, deleteUser } from '@/lib/db'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/user?wallet=ADDRESS или /api/user?id=ID - получить пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const wallet = searchParams.get('wallet')
    const id = searchParams.get('id')

    if (!wallet && !id) {
      return NextResponse.json({ error: 'Wallet address or ID required' }, { status: 400 })
    }

    let user
    if (id) {
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
    } else if (wallet) {
      // Получаем пользователя по wallet
      user = await getUserByWallet(wallet)
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user - создать или обновить пользователя при подключении кошелька
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Сначала проверяем, существует ли пользователь
    const existingUser = await getUserByWallet(wallet)
    
    if (existingUser) {
      // Пользователь уже существует - возвращаем его
      return NextResponse.json({ 
        user: existingUser,
        isNewUser: false
      })
    }
    
    // Создаем нового пользователя
    const newUser = await createOrUpdateUser(wallet)
    
    return NextResponse.json({ 
      user: newUser,
      isNewUser: true // Только что созданный пользователь
    })
  } catch (error) {
    console.error('Error creating/updating user:', error)
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