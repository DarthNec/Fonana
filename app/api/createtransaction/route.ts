import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/create-transaction - создать транзакцию Solana для мобильного приложения
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromPublicKey, toPublicKey, amount } = body

    console.log('[API] Creating Solana transaction:', {
      from: fromPublicKey,
      to: toPublicKey,
      amount: amount
    })

    // Валидация входных данных
    if (!fromPublicKey || !toPublicKey || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: fromPublicKey, toPublicKey, amount' },
        { status: 400 }
      )
    }

    // Проверка корректности публичных ключей
    try {
      new PublicKey(fromPublicKey)
      new PublicKey(toPublicKey)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid public key format' },
        { status: 400 }
      )
    }

    // Проверка суммы
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      )
    }

    // Получение кошелька платформы для комиссии
    const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET
    if (!platformWallet) {
      console.error('[API] NEXT_PUBLIC_PLATFORM_WALLET not configured')
      return NextResponse.json(
        { error: 'Platform wallet not configured' },
        { status: 500 }
      )
    }

    // Проверка корректности кошелька платформы
    try {
      new PublicKey(platformWallet)
    } catch (error) {
      console.error('[API] Invalid platform wallet:', platformWallet)
      return NextResponse.json(
        { error: 'Invalid platform wallet configuration' },
        { status: 500 }
      )
    }

    // Расчет комиссии платформы (10%) и суммы получателю (90%)
    const platformFee = amount * 0.1 // 10% комиссия
    const recipientAmount = amount * 0.9 // 90% получателю

    console.log('[API] Payment distribution:', {
      totalAmount: amount,
      recipientAmount: recipientAmount,
      platformFee: platformFee,
      platformWallet: platformWallet
    })

    // Подключение к Solana
    const connection = new Connection('https://rpc.helius.xyz/?api-key=29fc7f17-2a08-48da-9c14-88780e1fedd0')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    
    // Получаем текущий block height для расчета времени жизни
    const currentBlockHeight = await connection.getBlockHeight('confirmed')
    
    // Blockhash действителен в течение ~60-90 секунд (150 блоков)
    const blocksRemaining = lastValidBlockHeight - currentBlockHeight
    const estimatedSecondsRemaining = blocksRemaining * 0.4 // ~0.4 секунды на блок
    
    console.log('[API] Blockhash validity:', {
      blockhash: blockhash.substring(0, 8) + '...',
      currentBlockHeight,
      lastValidBlockHeight,
      blocksRemaining,
      estimatedSecondsRemaining: Math.floor(estimatedSecondsRemaining)
    })

    // Создание транзакции с двумя трансферами
    const tx = new Transaction({
      feePayer: new PublicKey(fromPublicKey),
      recentBlockhash: blockhash,
    })
    
    // Трансфер получателю (90%)
    tx.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPublicKey),
        toPubkey: new PublicKey(toPublicKey),
        lamports: Math.floor(recipientAmount * LAMPORTS_PER_SOL),
      })
    )
    
    // Трансфер платформе (10% комиссия)
    tx.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPublicKey),
        toPubkey: new PublicKey(platformWallet),
        lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
      })
    )

    // Сериализация транзакции
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    const transactionBase58 = bs58.encode(serialized)

    console.log('[API] Transaction created successfully:', {
      transactionLength: serialized.length,
      base58Length: transactionBase58.length,
      transfers: 2,
      recipientAmount: recipientAmount,
      platformFee: platformFee
    })

    return NextResponse.json({ 
      success: true,
      transactionBase58,
      distribution: {
        totalAmount: amount,
        recipientAmount: recipientAmount,
        platformFee: platformFee,
        platformWallet: platformWallet
      },
      // Информация о времени жизни транзакции
      validity: {
        blockhash,
        lastValidBlockHeight,
        currentBlockHeight,
        blocksRemaining,
        estimatedSecondsRemaining: Math.floor(estimatedSecondsRemaining),
        expiresAt: new Date(Date.now() + estimatedSecondsRemaining * 1000).toISOString(),
        warning: estimatedSecondsRemaining < 30 ? 'Transaction will expire soon, please sign and send immediately' : null
      }
    })
  } catch (error) {
    console.error('[API] Error creating transaction:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create transaction', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

