import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  calculatePaymentDistribution, 
  PLATFORM_WALLET,
  formatSolAmount 
} from '@/lib/solana/payments'
import { 
  validateTransaction, 
  waitForConfirmation 
} from '@/lib/solana/validation'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { creatorId, plan, price, signature } = body

    if (!creatorId || !plan || !price || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get creator details
    const creator = await prisma.user.findUnique({
      where: { id: creatorId }
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    const creatorWallet = creator.solanaWallet || creator.wallet
    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Creator wallet not found' },
        { status: 404 }
      )
    }

    // Get referrer if exists
    let referrerWallet: string | undefined
    if (creator.referrerId) {
      const referrer = await prisma.user.findUnique({
        where: { id: creator.referrerId },
        select: { solanaWallet: true, wallet: true }
      })
      referrerWallet = referrer?.solanaWallet || referrer?.wallet || undefined
    }

    // Calculate payment distribution
    const hasReferrer = !!referrerWallet
    const distribution = calculatePaymentDistribution(
      price,
      creatorWallet,
      hasReferrer,
      referrerWallet
    )

    // Prepare expected recipients
    const expectedRecipients = [
      creatorWallet,
      PLATFORM_WALLET
    ]
    if (distribution.referrerWallet) {
      expectedRecipients.push(distribution.referrerWallet)
    }

    // Wait for transaction confirmation
    console.log('Waiting for transaction confirmation:', signature)
    const isConfirmed = await waitForConfirmation(signature)

    if (!isConfirmed) {
      return NextResponse.json(
        { error: 'Transaction not confirmed' },
        { status: 400 }
      )
    }

    // Validate transaction
    const validation = await validateTransaction(
      signature,
      price,
      expectedRecipients
    )

    if (!validation.isValid) {
      console.error('Transaction validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error || 'Invalid transaction' },
        { status: 400 }
      )
    }

    // Create or update subscription
    const validUntil = new Date()
    if (plan === 'monthly') {
      validUntil.setMonth(validUntil.getMonth() + 1)
    } else if (plan === 'yearly') {
      validUntil.setFullYear(validUntil.getFullYear() + 1)
    }

    const subscription = await prisma.subscription.upsert({
      where: {
        userId_creatorId: {
          userId: session.user.id,
          creatorId: creator.id
        }
      },
      update: {
        plan,
        price,
        validUntil,
        isActive: true,
        txSignature: signature,
        paymentAmount: price,
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        creatorAmount: distribution.creatorAmount
      },
      create: {
        userId: session.user.id,
        creatorId: creator.id,
        plan,
        price,
        validUntil,
        isActive: true,
        txSignature: signature,
        paymentAmount: price,
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        creatorAmount: distribution.creatorAmount
      }
    })

    // Create transaction record
    await prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        txSignature: signature,
        fromWallet: validation.details!.from,
        toWallet: creatorWallet,
        amount: price,
        type: 'SUBSCRIPTION',
        status: 'CONFIRMED',
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount,
        referrerWallet: distribution.referrerWallet,
        confirmedAt: validation.details!.confirmedAt || new Date(),
        metadata: {
          plan,
          creatorId: creator.id,
          recipients: validation.details!.to
        }
      }
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        validUntil: subscription.validUntil,
        isActive: subscription.isActive
      },
      payment: {
        signature,
        amount: formatSolAmount(price),
        distribution: {
          creator: formatSolAmount(distribution.creatorAmount),
          platform: formatSolAmount(distribution.platformAmount),
          referrer: distribution.referrerAmount 
            ? formatSolAmount(distribution.referrerAmount)
            : null
        }
      }
    })

  } catch (error) {
    console.error('Process payment error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
} 