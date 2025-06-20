import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userWallet = request.headers.get('x-user-wallet')
    
    if (!userWallet) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }
    
    const messageId = params.id
    const { txSignature, price } = await request.json()
    
    if (!txSignature) {
      return NextResponse.json({ error: 'Transaction signature required' }, { status: 400 })
    }
    
    console.log('Purchasing message:', { messageId, txSignature, price })
    
    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Получаем сообщение
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        conversation: {
          include: {
            participants: {
              select: { id: true }
            }
          }
        }
      }
    })
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь участник чата
    const isParticipant = message.conversation.participants.some((p: any) => p.id === user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Проверяем, что сообщение платное
    if (!message.isPaid || !message.price) {
      return NextResponse.json({ error: 'Message is not paid' }, { status: 400 })
    }
    
    // Проверяем, не куплено ли уже
    const existingPurchase = await prisma.messagePurchase.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: user.id
        }
      }
    })
    
    if (existingPurchase) {
      return NextResponse.json({ error: 'Message already purchased' }, { status: 400 })
    }
    
    // Ждём подтверждения транзакции (как в рабочих подписках)
    console.log('Waiting for transaction confirmation:', txSignature)
    const isConfirmed = await waitForTransactionConfirmation(txSignature)
    
    if (!isConfirmed) {
      console.error('Transaction not confirmed:', txSignature)
      return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 })
    }
    
    // Создаем запись о покупке
    const purchase = await prisma.messagePurchase.create({
      data: {
        messageId,
        userId: user.id,
        amount: message.price,
        txSignature
      }
    })
    
    // Создаем транзакцию для истории
    await prisma.transaction.create({
      data: {
        type: 'MESSAGE_PURCHASE',
        senderId: user.id,
        receiverId: message.senderId,
        amount: message.price,
        txSignature,
        status: 'CONFIRMED',
        fromWallet: userWallet,
        toWallet: message.sender.wallet!
      }
    })
    
    // Возвращаем разблокированное сообщение
    return NextResponse.json({ 
      purchase,
      message: {
        id: message.id,
        content: message.content,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType
      }
    })
  } catch (error) {
    console.error('Error purchasing message:', error)
    return NextResponse.json({ error: 'Failed to purchase message' }, { status: 500 })
  }
} 