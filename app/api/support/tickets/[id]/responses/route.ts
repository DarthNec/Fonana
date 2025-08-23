import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserByWallet } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { message, isAdminResponse = false, userWallet } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Проверяем аутентификацию через wallet
    if (!userWallet) {
      return NextResponse.json({ error: 'Unauthorized - wallet required' }, { status: 401 })
    }

    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - invalid wallet' }, { status: 401 })
    }

    // Получаем тикет
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Проверяем права доступа
    const isAdmin = user.id === 'admin' || 
                   userWallet === 'HHJoYULyhpe7ZwbTLKfobEXnVybmxXrzQwjKW2xR7Baw'
    
    if (isAdminResponse && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can create admin responses' },
        { status: 403 }
      )
    }

    // Создаем ответ
    const response = await prisma.supportTicketResponse.create({
      data: {
        ticketId: params.id,
        adminId: user.id,
        adminWallet: userWallet,
        adminUsername: user.nickname || user.fullName || 'Unknown',
        message,
        isAdminResponse
      }
    })

    // Если это ответ админа, обновляем статус тикета
    if (isAdminResponse && ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { status: 'IN_PROGRESS' }
      })
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')

    // Проверяем аутентификацию через wallet
    if (!userWallet) {
      return NextResponse.json({ error: 'Unauthorized - wallet required' }, { status: 401 })
    }

    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - invalid wallet' }, { status: 401 })
    }

    // Получаем тикет
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Проверяем права доступа
    const isAdmin = user.id === 'admin' || 
                   userWallet === 'HHJoYULyhpe7ZwbTLKfobEXnVybmxXrzQwjKW2xR7Baw'
    
    if (ticket.userId !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Can only view your own tickets' },
        { status: 403 }
      )
    }

    // Получаем ответы
    const responses = await prisma.supportTicketResponse.findMany({
      where: { ticketId: params.id },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(responses)
  } catch (error) {
    console.error('Error fetching support ticket responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 