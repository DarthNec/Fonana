import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'
import { Connection, PublicKey } from '@solana/web3.js'

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

export async function POST(request: Request) {
  try {
    // Проверяем авторизацию
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET) as any
    } catch (error) {
      console.error('[BuySpins] JWT verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Получаем userId из токена
    const userId = decoded.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token: no userId' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { wallet, packageId, spins, priceUsd, priceSol, signature } = body

    // Валидация входных данных
    if (!wallet || !packageId || !spins || !priceUsd || !priceSol || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Находим пользователя по userId из токена
    const userFromToken = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userFromToken) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Проверяем, что wallet совпадает с пользователем из токена
    if (wallet !== userFromToken.wallet) {
      return NextResponse.json(
        { error: 'Wallet mismatch' },
        { status: 403 }
      )
    }

    // Валидация package
    const validPackages = ['package1', 'package2', 'package3']
    if (!validPackages.includes(packageId)) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      )
    }

    // Валидация spins
    const validSpins = [3, 6, 12]
    if (!validSpins.includes(spins)) {
      return NextResponse.json(
        { error: 'Invalid spins amount' },
        { status: 400 }
      )
    }

    console.log('[BuySpins] Purchase request:', {
      wallet,
      packageId,
      spins,
      priceUsd,
      priceSol,
      signature: signature.substring(0, 20) + '...'
    })

    // Проверяем транзакцию в блокчейне
    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      })

      if (!tx) {
        console.error('[BuySpins] Transaction not found:', signature)
        return NextResponse.json(
          { error: 'Transaction not found. Please wait a moment and try again.' },
          { status: 400 }
        )
      }

      if (tx.meta?.err) {
        console.error('[BuySpins] Transaction failed:', tx.meta.err)
        return NextResponse.json(
          { error: 'Transaction failed on blockchain' },
          { status: 400 }
        )
      }

      console.log('[BuySpins] Transaction verified:', signature)
    } catch (error) {
      console.error('[BuySpins] Error verifying transaction:', error)
      return NextResponse.json(
        { error: 'Failed to verify transaction' },
        { status: 500 }
      )
    }

    // Добавляем спины пользователю (используем userFromToken который уже нашли выше)
    const updatedUser = await prisma.user.update({
      where: { id: userFromToken.id },
      data: {
        availableWheelSpins: {
          increment: spins
        }
      }
    })

    console.log('[BuySpins] Spins added:', {
      userId: userFromToken.id,
      wallet,
      spinsAdded: spins,
      newTotal: updatedUser.availableWheelSpins
    })

    // TODO: Опционально - записываем транзакцию в отдельную таблицу для истории покупок
    // await prisma.spinPurchase.create({ ... })

    return NextResponse.json({
      success: true,
      spinsAdded: spins,
      totalSpins: updatedUser.availableWheelSpins,
      transaction: signature
    })

  } catch (error: any) {
    console.error('[BuySpins] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
