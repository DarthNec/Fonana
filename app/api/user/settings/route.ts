import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

// GET /api/user/settings - получить настройки пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем настройки пользователя
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })
    
    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: user.id }
      })
    }
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/user/settings - обновить настройки пользователя
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const data = await request.json()
    
    // Обновляем или создаем настройки
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        notifyComments: data.notifyComments,
        notifyLikes: data.notifyLikes,
        notifyNewPosts: data.notifyNewPosts,
        notifySubscriptions: data.notifySubscriptions,
        showActivity: data.showActivity,
        allowMessages: data.allowMessages,
        showOnlineStatus: data.showOnlineStatus,
        theme: data.theme
      },
      create: {
        userId: user.id,
        notifyComments: data.notifyComments ?? true,
        notifyLikes: data.notifyLikes ?? true,
        notifyNewPosts: data.notifyNewPosts ?? true,
        notifySubscriptions: data.notifySubscriptions ?? true,
        showActivity: data.showActivity ?? true,
        allowMessages: data.allowMessages ?? true,
        showOnlineStatus: data.showOnlineStatus ?? true,
        theme: data.theme ?? 'dark'
      }
    })
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
} 