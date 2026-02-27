import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/wheel
 * 
 * Получить количество доступных вращений колеса для пользователя
 * 
 * Query Parameters:
 * - wallet: string (required) - Адрес кошелька пользователя
 * 
 * Response:
 * - 200: { availableSpins: number, user: { id, nickname, wallet } }
 * - 400: { error: "Wallet parameter is required" }
 * - 404: { error: "User not found" }
 * - 500: { error: "Internal server error" }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    // Валидация
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet parameter is required' },
        { status: 400 }
      )
    }

    // Получаем пользователя по кошельку
    const user = await prisma.user.findUnique({
      where: {
        wallet: wallet
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        availableWheelSpins: true
      }
    })

    // Если пользователь не найден
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Возвращаем количество доступных спинов
    return NextResponse.json({
      availableSpins: user.availableWheelSpins,
      user: {
        id: user.id,
        nickname: user.nickname,
        wallet: user.wallet
      }
    })

  } catch (error) {
    console.error('[API] Error fetching wheel spins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wheel
 * 
 * Декрементировать количество доступных вращений колеса
 * 
 * Body:
 * - wallet: string (required) - Адрес кошелька пользователя
 * 
 * Response:
 * - 200: { success: true, spinsRemaining: number }
 * - 400: { error: "No spins available" | "Wallet is required" }
 * - 404: { error: "User not found" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet } = body

    // Валидация
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet is required' },
        { status: 400 }
      )
    }

    // Получаем пользователя по кошельку
    const user = await prisma.user.findUnique({
      where: {
        wallet: wallet
      },
      select: {
        id: true,
        availableWheelSpins: true
      }
    })

    // Если пользователь не найден
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ✅ Проверяем, что есть доступные вращения
    if (user.availableWheelSpins <= 0) {
      return NextResponse.json(
        { error: 'No spins available' },
        { status: 400 }
      )
    }

    // ✅ Минусуем одно вращение
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        availableWheelSpins: {
          decrement: 1
        }
      },
      select: {
        availableWheelSpins: true
      }
    })

    console.log(`[API] Wheel spin: User ${user.id} | Spins remaining: ${updatedUser.availableWheelSpins}`)

    // ✅ Возвращаем успех и новое количество вращений
    return NextResponse.json({
      success: true,
      spinsRemaining: updatedUser.availableWheelSpins
    })

  } catch (error) {
    console.error('[API] Error decrementing wheel spins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
