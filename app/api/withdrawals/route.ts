import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, amount, toWallet } = body
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (amount < 0.1) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is 0.1 SOL' },
        { status: 400 }
      )
    }

    // Check user's available balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallet: true, solanaWallet: true }
    })

    if (!user?.wallet) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 400 }
      )
    }

    // Get user's confirmed earnings
    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        toWallet: {
          in: [user.wallet, user.solanaWallet].filter(Boolean) as string[]
        },
        status: 'CONFIRMED'
      }
    })

    const totalEarnings = confirmedTransactions.reduce((sum, tx) => {
      const creatorAmount = tx.amount - (tx.platformFee || 0) - (tx.referrerFee || 0)
      return sum + creatorAmount
    }, 0)

    // Get previous withdrawals
    const previousWithdrawals = await prisma.transaction.findMany({
      where: {
        fromWallet: {
          in: [user.wallet, user.solanaWallet].filter(Boolean) as string[]
        },
        type: 'WITHDRAWAL',
        status: 'CONFIRMED'
      }
    })

    const totalWithdrawn = previousWithdrawals.reduce((sum, tx) => sum + tx.amount, 0)
    const availableBalance = totalEarnings - totalWithdrawn

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Create withdrawal record
    const withdrawal = await prisma.transaction.create({
      data: {
        type: 'WITHDRAWAL',
        fromWallet: 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4', // Platform wallet
        toWallet: toWallet || user.wallet!,
        amount,
        currency: 'SOL',
        status: 'PENDING',
        txSignature: `withdrawal_${Date.now()}_${userId}`, // Temporary signature
        metadata: {
          userId: userId,
          requestedAt: new Date().toISOString(),
          availableBalance,
          note: 'Creator withdrawal request'
        }
      }
    })

    // Send notification to user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'TIP_RECEIVED', // Using existing type, could add WITHDRAWAL_REQUESTED
        title: 'Запрос на вывод средств',
        message: `Ваш запрос на вывод ${amount} SOL принят и будет обработан в течение 24 часов`,
        metadata: {
          withdrawalId: withdrawal.id,
          amount
        }
      }
    })

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      }
    })

  } catch (error) {
    console.error('Error processing withdrawal:', error)
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}

// GET /api/withdrawals - Get user's withdrawal history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallet: true, solanaWallet: true }
    })

    if (!user?.wallet) {
      return NextResponse.json({ withdrawals: [] })
    }

    const withdrawals = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: user.wallet },
          { fromWallet: user.solanaWallet || '' }
        ],
        type: 'WITHDRAWAL'
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ withdrawals })

  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch withdrawals' },
      { status: 500 }
    )
  }
} 