import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id
    const body = await request.json()
    const { userWallet, content, mediaUrl, mediaType } = body

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем пользователя
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что сообщение существует и принадлежит пользователю
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: user.id
      }
    })

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Обновляем сообщение
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content || existingMessage.content,
        mediaUrl: mediaUrl || existingMessage.mediaUrl,
        mediaType: mediaType || existingMessage.mediaType,
        isEdited: true // Временно закомментировано до обновления Prisma клиента 
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        purchases: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: updatedMessage,
      success: true 
    })

  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id
    const body = await request.json()
    const { userWallet } = body

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet required' }, { status: 400 })
    }

    // Получаем пользователя
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Проверяем, что сообщение существует и принадлежит пользователю
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: user.id
      }
    })

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 })
    }

    // Soft delete - помечаем сообщение как удаленное
    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true // Временно закомментировано до обновления Prisma клиента
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        purchases: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    })

    console.log('🎯 [DELETE MESSAGE] Message soft deleted:', {
      messageId,
      userId: user.id,
      isDeleted: deletedMessage.isDeleted // Временно закомментировано до обновления Prisma клиента
    })

    return NextResponse.json({ 
      message: deletedMessage,
      success: true 
    })

  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
