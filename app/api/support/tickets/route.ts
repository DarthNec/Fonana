import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserByWallet } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userWallet, username, subject, description, images } = body

    // Валидация данных
    if (!userId || !userWallet || !username || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Проверяем аутентификацию через wallet
    const user = await getUserByWallet(userWallet)
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid wallet or user mismatch' },
        { status: 401 }
      )
    }

    // Создаем тикет
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        userWallet,
        username,
        subject,
        description,
        images: images || [],
        status: 'OPEN'
      }
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const userWallet = searchParams.get('userWallet')

    // Проверяем аутентификацию через wallet
    if (!userWallet) {
      return NextResponse.json({ error: 'Unauthorized - wallet required' }, { status: 401 })
    }

    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - invalid wallet' }, { status: 401 })
    }

    // Если указан userId, проверяем права доступа
    if (userId && userId !== 'me' && userId !== user.id) {
      return NextResponse.json(
        { error: 'Can only view your own tickets' },
        { status: 403 }
      )
    }

    // Строим фильтр
    const where: any = {}
    if (userId === 'me') {
      where.userId = user.id
    } else if (userId) {
      where.userId = userId
    }
    if (status) {
      where.status = status
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        responses: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 