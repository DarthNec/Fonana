import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtManager } from '@/lib/utils/jwt'

/**
 * API для подключения реального Solana кошелька к Telegram или гостевому аккаунту
 * Меняет fake wallet (TG_... или FK_...) на настоящий Phantom кошелек
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldWallet, newWallet } = body

    console.log('🔗 [WALLET CONNECT] Request:', {
      oldWallet: oldWallet?.substring(0, 10) + '...',
      newWallet: newWallet?.substring(0, 10) + '...'
    })

    // Валидация
    if (!oldWallet || !newWallet) {
      return NextResponse.json(
        { success: false, error: 'Both oldWallet and newWallet are required' },
        { status: 400 }
      )
    }

    // Проверяем, что старый кошелек начинается с TG_ или FK_
    if (!oldWallet.startsWith('TG_') && !oldWallet.startsWith('FK_')) {
      return NextResponse.json(
        { success: false, error: 'Old wallet must be a Telegram (TG_...) or Guest (FK_...) wallet' },
        { status: 400 }
      )
    }

    // Проверяем, что новый кошелек НЕ начинается с TG_ или FK_
    if (newWallet.startsWith('TG_') || newWallet.startsWith('FK_')) {
      return NextResponse.json(
        { success: false, error: 'New wallet cannot be a Telegram or Guest wallet' },
        { status: 400 }
      )
    }

    // Находим пользователя по старому кошельку
    const user = await prisma.user.findFirst({
      where: { wallet: oldWallet }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found with this wallet' },
        { status: 404 }
      )
    }

    console.log('🔗 [WALLET CONNECT] User found:', {
      userId: user.id,
      nickname: user.nickname,
      telegramId: user.telegramId
    })

    // Проверяем, не занят ли новый кошелек другим пользователем
    const existingUserWithNewWallet = await prisma.user.findFirst({
      where: { 
        wallet: newWallet,
        id: { not: user.id } // Исключаем текущего пользователя
      }
    })

    if (existingUserWithNewWallet) {
      return NextResponse.json(
        { success: false, error: 'This wallet is already connected to another account' },
        { status: 409 }
      )
    }

    // Обновляем кошелек пользователя
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        wallet: newWallet,
        solanaWallet: newWallet,
        updatedAt: new Date()
      }
    })

    console.log('🔗 [WALLET CONNECT] Wallet updated successfully:', {
      userId: updatedUser.id,
      oldWallet: oldWallet.substring(0, 10) + '...',
      newWallet: newWallet.substring(0, 10) + '...'
    })

    // Генерируем новый JWT token для нового кошелька
    const newToken = await jwtManager.generateToken(newWallet)

    return NextResponse.json({
      success: true,
      message: 'Wallet connected successfully',
      user: {
        id: updatedUser.id,
        nickname: updatedUser.nickname,
        wallet: updatedUser.wallet,
        solanaWallet: updatedUser.solanaWallet
      },
      token: newToken
    })

  } catch (error) {
    console.error('🔗 [WALLET CONNECT] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
