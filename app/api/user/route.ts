import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, getUserByWallet, updateUserProfile, deleteUser } from '@/lib/db'

// GET /api/user?wallet=ADDRESS - получить пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const user = await getUserByWallet(wallet)
    
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

    // Создаем пользователя если его нет, или возвращаем существующего
    const user = await createOrUpdateUser(wallet)

    return NextResponse.json({ 
      user,
      isNewUser: !user.nickname // Если нет никнейма - значит новый пользователь
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