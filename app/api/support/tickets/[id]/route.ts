import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserByWallet } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, userWallet } = body

    if (!status || !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
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

    // Проверяем права администратора
    const isAdmin = user.id === 'admin' || 
                   userWallet === 'HHJoYULyhpe7ZwbTLKfobEXnVybmxXrzQwjKW2xR7Baw'
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can update ticket status' },
        { status: 403 }
      )
    }

    // Обновляем статус тикета
    const ticket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: { status }
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error updating support ticket:', error)
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
      include: {
        user: true,
        responses: {
          orderBy: { createdAt: 'asc' }
        }
      }
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

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 