import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'
import { getConnection } from '@/lib/solana/connection'

// WebSocket события
import { sendNotification } from '@/lib/services/websocket-client'

export const dynamic = 'force-dynamic'

// POST /api/tips/mobile - отправить чаевые (мобильная версия без JWT)
export async function POST(request: Request) {
  try {
    console.log('[API/tips/mobile] Starting tip request')
    
    const { 
      userId,           // ID отправителя (вместо JWT)
      creatorId, 
      amount, 
      txSignature, 
      conversationId 
    } = await request.json()
    
    console.log('[API/tips/mobile] Tip request received:', { 
      userId, 
      creatorId, 
      amount, 
      txSignature, 
      conversationId 
    })
    
    // Валидация входных данных
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    if (!creatorId || !amount || !txSignature) {
      return NextResponse.json(
        { error: 'Creator ID, amount and transaction signature are required' },
        { status: 400 }
      )
    }
    
    // Валидация суммы
    if (amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { error: 'Invalid tip amount' },
        { status: 400 }
      )
    }
    
    // Проверяем, что транзакция еще не была записана
    const existingTransaction = await prisma.transaction.findUnique({
      where: { txSignature }
    })
    
    if (existingTransaction) {
      console.log('[API/tips/mobile] Transaction already recorded:', txSignature)
      return NextResponse.json(
        { 
          success: true,
          transaction: existingTransaction,
          message: 'Transaction already recorded' 
        }
      )
    }
    
    // Даем транзакции дополнительное время попасть в сеть
    console.log('[API/tips/mobile] Waiting 3 seconds before checking transaction...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Проверяем транзакцию более подробно
    try {
      const connection = getConnection()
      console.log('[API/tips/mobile] Getting transaction status for:', txSignature)
      
      const status = await connection.getSignatureStatus(txSignature)
      console.log('[API/tips/mobile] Initial status check:', {
        value: status.value,
        slot: status.context.slot
      })
      
      // Если транзакция не найдена, даем больше времени
      if (!status.value) {
        console.log('[API/tips/mobile] Transaction not found yet, waiting 5 more seconds...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } catch (error) {
      console.error('[API/tips/mobile] Error checking initial status:', error)
    }
    
    // Ждём подтверждения транзакции
    console.log('[API/tips/mobile] Starting transaction confirmation check:', txSignature)
    const isConfirmed = await waitForTransactionConfirmation(txSignature)
    
    if (!isConfirmed) {
      console.error('[API/tips/mobile] Transaction not confirmed:', txSignature)
      
      // Дополнительная диагностика
      try {
        const connection = getConnection()
        const finalStatus = await connection.getSignatureStatus(txSignature)
        console.error('[API/tips/mobile] Final status:', {
          value: finalStatus.value,
          slot: finalStatus.context.slot
        })
        
        // Пытаемся получить детали транзакции
        const tx = await connection.getTransaction(txSignature, {
          maxSupportedTransactionVersion: 0
        })
        
        if (tx) {
          console.error('[API/tips/mobile] Transaction found but not confirmed:', {
            slot: tx.slot,
            blockTime: tx.blockTime,
            err: tx.meta?.err
          })
        } else {
          console.error('[API/tips/mobile] Transaction not found in blockchain')
        }
      } catch (error) {
        console.error('[API/tips/mobile] Error getting transaction details:', error)
      }
      
      return NextResponse.json(
        { error: 'Transaction not confirmed' },
        { status: 400 }
      )
    }
    
    console.log('[API/tips/mobile] Transaction confirmed successfully:', txSignature)
    
    // Получаем пользователя (отправителя)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        wallet: true,
        solanaWallet: true,
        nickname: true,
        fullName: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем создателя (получателя)
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
          senderId: userId,
          receiverId: creatorId,
          senderName: user.nickname || user.fullName,
          creatorName: creator.nickname || creator.fullName,
          conversationId,
          source: 'mobile'
        }
      }
    })
    
    console.log('[API/tips/mobile] Transaction created:', transaction.id)
    
    // Создаем уведомление для создателя
    const notification = await prisma.notification.create({
      data: {
        userId: creatorId,
        type: 'TIP_RECEIVED',
        title: 'New Tip Received!',
        message: `You received a ${amount} SOL tip${conversationId ? ' in a message' : ''}!`,
        metadata: {
          senderId: userId,
          senderName: user.nickname || user.fullName,
          amount,
          conversationId,
          source: 'mobile'
        }
      }
    })
    
    console.log('[API/tips/mobile] Notification created:', notification.id)
    
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
      console.log('[API/tips/mobile] WebSocket notification sent')
    } catch (error) {
      console.error('[API/tips/mobile] WebSocket notification failed:', error)
    }
    
    // Если это чаевые из чата, создаем сообщение о донате в беседе
    if (conversationId) {
      console.log('[API/tips/mobile] Creating tip message in conversation:', conversationId)
      
      // Определяем уровень доната
      let tipLevel: 'small' | 'medium' | 'large' | 'legendary' = 'small'
      if (amount >= 5) tipLevel = 'legendary'
      else if (amount >= 1) tipLevel = 'large'
      else if (amount >= 0.1) tipLevel = 'medium'
      
      // Создаем системное сообщение о донате
      const tipMessage = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
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
            creatorName: creator.nickname || creator.fullName || 'Creator',
            source: 'mobile'
          } as any
        }
      })
      
      console.log('[API/tips/mobile] Tip message created:', tipMessage.id)
      
      // Обновляем lastMessageAt в чате
      try {
        await prisma.$executeRaw`
          UPDATE "Conversation"
          SET "lastMessageAt" = ${new Date()}
          WHERE id = ${conversationId}
        `
      } catch (updateError) {
        console.warn('[API/tips/mobile] Failed to update lastMessageAt:', updateError)
      }
    }
    
    return NextResponse.json({ 
      success: true,
      transaction,
      message: 'Tip sent successfully'
    })
    
  } catch (error) {
    console.error('[API/tips/mobile] Error recording tip:', error)
    return NextResponse.json({ 
      error: 'Failed to record tip',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


