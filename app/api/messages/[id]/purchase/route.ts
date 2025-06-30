import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { waitForTransactionConfirmation } from '@/lib/solana/validation'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

// Purchase a paid message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Check if user is participant of the conversation using raw query
    const isParticipant = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count
      FROM "_UserConversations"
      WHERE "A" = ${message.conversationId} AND "B" = ${user.id}
    `
    
    if (!isParticipant[0] || Number(isParticipant[0].count) === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
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