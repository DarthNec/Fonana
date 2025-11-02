import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/dogWater - проверить и установить флаг покупки Dog Water
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recieveWallet, tokensReceived } = body

    if (!recieveWallet) {
      return NextResponse.json(
        { error: 'recieveWallet is required' },
        { status: 400 }
      )
    }

    console.log('[dogWater] Processing request:', {
      wallet: recieveWallet,
      tokensReceived
    })

    // Получаем пользователя по кошельку
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: recieveWallet },
          { solanaWallet: recieveWallet }
        ]
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, купил ли уже пользователь Dog Water
    // @ts-expect-error - Поле isBoughtDogWater будет доступно после генерации Prisma Client
    if (user.isBoughtDogWater) {
      return NextResponse.json({
        status: 200,
        message: 'Dog water already was bought',
        alreadyBought: true
      })
    }

    // Обновляем флаг верификации и количество токенов
    const updateData: any = {
      isBoughtDogWater: true
    }

    // Если передано количество токенов, обновляем баланс
    if (tokensReceived && typeof tokensReceived === 'number') {
      // @ts-expect-error - Поле dogWaterTokens будет доступно после генерации Prisma Client
      const currentBalance = user.dogWaterTokens || 0
      updateData.dogWaterTokens = currentBalance + tokensReceived
      console.log('[dogWater] Updating token balance:', {
        current: currentBalance,
        received: tokensReceived,
        new: updateData.dogWaterTokens
      })
    }

    // Устанавливаем флаг, что пользователь купил Dog Water
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    console.log('[dogWater] User successfully marked as bought Dog Water:', user.id)

    return NextResponse.json({
      status: 200,
      message: 'Dog water purchased successfully',
      alreadyBought: false,
      tokensAdded: tokensReceived || 0
    })

  } catch (error) {
    console.error('[dogWater] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

