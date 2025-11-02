import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'

// Purchase a paid message (Mobile version - без auth token)
export async function POST(request: NextRequest) {
  try {
    console.log('[API/messages/purchase/mobile] Starting mobile purchase process...')
    
    const { userId, messageId, txSignature } = await request.json()
    
    console.log('[API/messages/purchase/mobile] Request data:', { 
      userId: userId ? 'present' : 'missing',
      messageId: messageId ? 'present' : 'missing',
      txSignature: txSignature ? 'present' : 'missing'
    })
    
    // Валидация входных данных
    if (!userId) {
      console.log('[API/messages/purchase/mobile] Missing userId')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    if (!messageId) {
      console.log('[API/messages/purchase/mobile] Missing messageId')
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }
    
    if (!txSignature) {
      console.log('[API/messages/purchase/mobile] Missing txSignature')
      return NextResponse.json({ error: 'Transaction signature required' }, { status: 400 })
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      console.log('[API/messages/purchase/mobile] User not found:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('[API/messages/purchase/mobile] User found:', user.id)
    
    // Get message with conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        sender: {
          select: {
            id: true,
            wallet: true
          }
        }
      }
    })
    
    if (!message) {
      console.log('[API/messages/purchase/mobile] Message not found:', messageId)
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    console.log('[API/messages/purchase/mobile] Message found:', {
      id: message.id,
      isPaid: message.isPaid,
      price: message.price
    })
    
    if (!message.isPaid || !message.price) {
      console.log('[API/messages/purchase/mobile] Message is not paid')
      return NextResponse.json({ error: 'Message is not paid' }, { status: 400 })
    }
    
    // Check if user is participant of the conversation using new structure
    console.log('[API/messages/purchase/mobile] Checking conversation participation...')
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${message.conversationId}
    `
    
    console.log('[API/messages/purchase/mobile] Conversation query result:', conversation)
    
    if (!conversation || conversation.length === 0) {
      console.log('[API/messages/purchase/mobile] Conversation not found')
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    console.log('[API/messages/purchase/mobile] User ID:', user.id, 'Conversation participants:', conv.fromUserId, conv.toUserId)
    
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      console.log('[API/messages/purchase/mobile] Access denied - user not participant')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    console.log('[API/messages/purchase/mobile] User is participant, continuing...')
    
    // Check if already purchased
    const existingPurchase = await prisma.messagePurchase.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: user.id
        }
      }
    })
    
    if (existingPurchase) {
      console.log('[API/messages/purchase/mobile] Message already purchased')
      return NextResponse.json({ error: 'Message already purchased' }, { status: 400 })
    }
    
    // Confirm transaction
    console.log('[API/messages/purchase/mobile] Confirming transaction:', txSignature)
    const txConfirmed = await waitForTransactionConfirmation(txSignature)
    
    if (!txConfirmed) {
      console.log('[API/messages/purchase/mobile] Transaction not confirmed')
      return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 })
    }
    
    console.log('[API/messages/purchase/mobile] Transaction confirmed, creating purchase record...')
    
    // Create purchase record
    const purchase = await prisma.messagePurchase.create({
      data: {
        messageId,
        userId: user.id,
        amount: message.price,
        txSignature
      }
    })
    
    console.log('[API/messages/purchase/mobile] Purchase created:', purchase.id)
    
    // Get full message data for response
    const fullMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            wallet: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        }
      }
    })
    
    console.log('[API/messages/purchase/mobile] Purchase completed successfully')
    
    return NextResponse.json({ 
      success: true,
      purchase,
      message: fullMessage
    })
  } catch (error) {
    console.error('[API/messages/purchase/mobile] Error purchasing message:', error)
    return NextResponse.json({ 
      error: 'Failed to purchase message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

