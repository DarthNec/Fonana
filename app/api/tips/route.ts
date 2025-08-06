import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'
import { getConnection } from '@/lib/solana/connection'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

const prisma = new PrismaClient()

// WebSocket события
import { sendNotification } from '@/lib/services/websocket-client'

export async function POST(request: NextRequest) {
  try {
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { creatorId, amount, txSignature, conversationId } = await request.json()
    
    console.log('Tip request received:', { creatorId, amount, txSignature, conversationId })
    
    if (!creatorId || !amount || !txSignature) {
      return NextResponse.json(
        { error: 'Creator ID, amount and transaction signature are required' },
        { status: 400 }
      )
    }
    
    // Проверяем, что транзакция еще не была записана
    const existingTransaction = await prisma.transaction.findUnique({
      where: { txSignature }
    })
    
    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction already recorded' },
        { status: 400 }
      )
    }
    
    // Даем транзакции дополнительное время попасть в сеть (как в других местах)
    console.log('Waiting 3 seconds before checking transaction...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Проверяем транзакцию более подробно
    try {
      const connection = getConnection()
      console.log('Getting transaction status for:', txSignature)
      
      const status = await connection.getSignatureStatus(txSignature)
      console.log('Initial status check:', {
        value: status.value,
        slot: status.context.slot
      })
      
      // Если транзакция не найдена, даем больше времени
      if (!status.value) {
        console.log('Transaction not found yet, waiting 5 more seconds...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } catch (error) {
      console.error('Error checking initial status:', error)
    }
    
    // Ждём подтверждения транзакции (как в рабочих подписках)
    console.log('Starting transaction confirmation check:', txSignature)
    const isConfirmed = await waitForTransactionConfirmation(txSignature)
    
    if (!isConfirmed) {
      console.error('Transaction not confirmed:', txSignature)
      
      // Дополнительная диагностика
      try {
        const connection = getConnection()
        const finalStatus = await connection.getSignatureStatus(txSignature)
        console.error('Final status:', {
          value: finalStatus.value,
          slot: finalStatus.context.slot
        })
        
        // Пытаемся получить детали транзакции
        const tx = await connection.getTransaction(txSignature, {
          maxSupportedTransactionVersion: 0
        })
        
        if (tx) {
          console.error('Transaction found but not confirmed:', {
            slot: tx.slot,
            blockTime: tx.blockTime,
            err: tx.meta?.err
          })
        } else {
          console.error('Transaction not found in blockchain')
        }
      } catch (error) {
        console.error('Error getting transaction details:', error)
      }
      
      return NextResponse.json(
        { error: 'Transaction not confirmed' },
        { status: 400 }
      )
    }
    console.log('Transaction confirmed successfully:', txSignature)
    
    // Получаем пользователя по ID из токена
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем создателя
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        wallet: true,
        solanaWallet: true,
        nickname: true,
        fullName: true
      }
    })
    
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }
    
    const creatorWallet = creator.solanaWallet || creator.wallet || ''
    const userWallet = user.solanaWallet || user.wallet || ''
    
    // Создаем запись о транзакции
    const transaction = await prisma.transaction.create({
      data: {
        fromWallet: userWallet,
        toWallet: creatorWallet,
        type: 'TIP',
        amount,
        currency: 'SOL',
        status: 'CONFIRMED',
        txSignature,
        confirmedAt: new Date(),
        metadata: {
          senderId: user.id,
          receiverId: creatorId,
          senderName: user.nickname || user.fullName,
          creatorName: creator.nickname || creator.fullName,
          conversationId
        }
      }
    })
    
    // Создаем уведомление для создателя
    const notification = await prisma.notification.create({
      data: {
        userId: creatorId,
        type: 'TIP_RECEIVED',
        title: 'New Tip Received!',
        message: `You received a ${amount} SOL tip${conversationId ? ' in a message' : ''}!`,
        metadata: {
          senderId: user.id,
          amount,
          conversationId
        }
      }
    })
    
    // Отправляем WebSocket уведомление
    try {
      await sendNotification(creatorId, {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: {
          ...notification.metadata as any,
          id: notification.id,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      })
    } catch (error) {
      console.error('WebSocket notification failed:', error)
    }
    
    // Если это чаевые из чата, создаем сообщение о донате в беседе
    if (conversationId) {
      // Определяем уровень доната
      let tipLevel: 'small' | 'medium' | 'large' | 'legendary' = 'small'
      if (amount >= 5) tipLevel = 'legendary'
      else if (amount >= 1) tipLevel = 'large'
      else if (amount >= 0.1) tipLevel = 'medium'
      
      // Создаем системное сообщение о донате
      await prisma.message.create({
        data: {
          conversationId,
          senderId: user.id,
          content: null,
          mediaUrl: null,
          mediaType: null,
          isPaid: false,
          isRead: false,
          metadata: {
            type: 'tip',
            amount,
            tipLevel,
            senderName: user.nickname || user.fullName || 'Anonymous',
            creatorName: creator.nickname || creator.fullName || 'Creator'
          } as any
        }
      })
    }
    
    return NextResponse.json({ 
      success: true,
      transaction 
    })
  } catch (error) {
    console.error('Error recording tip:', error)
    return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 })
  }
} 