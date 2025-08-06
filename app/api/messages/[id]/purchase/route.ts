import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

const prisma = new PrismaClient()

// Purchase a paid message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API/messages/purchase] Starting purchase process...')
    
    // Проверяем JWT токен
    const authHeader = request.headers.get('authorization')
    console.log('[API/messages/purchase] Auth header:', authHeader ? 'present' : 'missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[API/messages/purchase] No valid auth header')
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('[API/messages/purchase] Token received:', token ? 'yes' : 'no')
    
    let decoded: any
    
    try {
      decoded = jwt.verify(token, ENV.NEXTAUTH_SECRET)
      console.log('[API/messages/purchase] Token verified, userId:', decoded.userId)
    } catch (error) {
      console.log('[API/messages/purchase] Token verification failed:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const messageId = params.id
    const { txSignature } = await request.json()
    
    if (!txSignature) {
      return NextResponse.json({ error: 'Transaction signature required' }, { status: 400 })
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
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
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    
    if (!message.isPaid || !message.price) {
      return NextResponse.json({ error: 'Message is not paid' }, { status: 400 })
    }
    
    // Check if user is participant of the conversation using new structure
    console.log('[API/messages/purchase] Checking conversation participation...')
    const conversation = await prisma.$queryRaw<{fromUserId: string, toUserId: string}[]>`
      SELECT "fromUserId", "toUserId"
      FROM "Conversation"
      WHERE id = ${message.conversationId}
    `
    
    console.log('[API/messages/purchase] Conversation query result:', conversation)
    
    if (!conversation || conversation.length === 0) {
      console.log('[API/messages/purchase] Conversation not found')
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    
    const conv = conversation[0]
    console.log('[API/messages/purchase] User ID:', user.id, 'Conversation participants:', conv.fromUserId, conv.toUserId)
    
    if (conv.fromUserId !== user.id && conv.toUserId !== user.id) {
      console.log('[API/messages/purchase] Access denied - user not participant')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    console.log('[API/messages/purchase] User is participant, continuing...')
    
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
      return NextResponse.json({ error: 'Message already purchased' }, { status: 400 })
    }
    
    // Confirm transaction
    const txConfirmed = await waitForTransactionConfirmation(txSignature)
    
    if (!txConfirmed) {
      return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 })
    }
    
    // Create purchase record
    const purchase = await prisma.messagePurchase.create({
      data: {
        messageId,
        userId: user.id,
        amount: message.price,
        txSignature
      }
    })
    
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
    
    return NextResponse.json({ 
      purchase,
      message: fullMessage
    })
  } catch (error) {
    console.error('Error purchasing message:', error)
    return NextResponse.json({ error: 'Failed to purchase message' }, { status: 500 })
  }
} 