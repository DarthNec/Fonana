import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/flash-sales - получить активные Flash Sales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const postId = searchParams.get('postId')
    const includeExpired = searchParams.get('includeExpired') === 'true'
    
    const now = new Date()
    
    // Базовые условия поиска
    const where: any = {}
    
    if (!includeExpired) {
      where.isActive = true
      where.endAt = { gte: now }
      where.startAt = { lte: now }
    }
    
    if (creatorId) {
      where.creatorId = creatorId
    }
    
    if (postId) {
      where.postId = postId
    }
    
    // Получаем Flash Sales с релейшенами
    const flashSales = await prisma.flashSale.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            type: true,
            thumbnail: true
          }
        },
        _count: {
          select: {
            redemptions: true
          }
        }
      },
      orderBy: [
        { endAt: 'asc' },
        { discount: 'desc' }
      ]
    })
    
    // Форматируем данные для фронтенда
    const formattedSales = flashSales.map((sale: any) => ({
      ...sale,
      remainingRedemptions: sale.maxRedemptions ? sale.maxRedemptions - sale.usedCount : null,
      isExpired: sale.endAt < now,
      timeLeft: sale.endAt > now ? Math.floor((sale.endAt.getTime() - now.getTime()) / 1000) : 0,
      redemptionsCount: sale._count.redemptions
    }))
    
    return NextResponse.json({ flashSales: formattedSales })
  } catch (error) {
    console.error('Error fetching flash sales:', error)
    return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 })
  }
}

// POST /api/flash-sales - создать новый Flash Sale (только для авторов)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creatorWallet, 
      postId, 
      subscriptionPlan,
      discount, 
      duration, // в минутах
      maxRedemptions 
    } = body
    
    // Валидация
    if (!creatorWallet) {
      return NextResponse.json({ error: 'Creator wallet required' }, { status: 400 })
    }
    
    if (!discount || discount < 10 || discount > 90) {
      return NextResponse.json({ error: 'Discount must be between 10 and 90' }, { status: 400 })
    }
    
    if (!duration || duration < 5 || duration > 1440) {
      return NextResponse.json({ error: 'Duration must be between 5 and 1440 minutes' }, { status: 400 })
    }
    
    // Проверяем, что пользователь - автор
    const creator = await getUserByWallet(creatorWallet)
    if (!creator || !creator.isCreator) {
      return NextResponse.json({ error: 'Only creators can create flash sales' }, { status: 403 })
    }
    
    // Проверяем, что пост принадлежит автору (если указан)
    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId }
      })
      
      if (!post || post.creatorId !== creator.id) {
        return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 })
      }
    }
    
    // Проверяем, нет ли уже активной распродажи для этого поста/плана
    const existingSale = await prisma.flashSale.findFirst({
      where: {
        creatorId: creator.id,
        isActive: true,
        endAt: { gte: new Date() },
        OR: [
          { postId: postId || undefined },
          { subscriptionPlan: subscriptionPlan || undefined }
        ]
      }
    })
    
    if (existingSale) {
      return NextResponse.json({ 
        error: 'An active flash sale already exists for this item' 
      }, { status: 400 })
    }
    
    // Вычисляем время окончания
    const endAt = new Date()
    endAt.setMinutes(endAt.getMinutes() + duration)
    
    // Создаем Flash Sale
    const flashSale = await prisma.flashSale.create({
      data: {
        creatorId: creator.id,
        postId,
        subscriptionPlan,
        discount,
        maxRedemptions,
        endAt,
        isActive: true
      },
      include: {
        post: true
      }
    })
    
    return NextResponse.json({ flashSale })
  } catch (error) {
    console.error('Error creating flash sale:', error)
    return NextResponse.json({ error: 'Failed to create flash sale' }, { status: 500 })
  }
}

// DELETE /api/flash-sales/:id - отменить Flash Sale
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userWallet = searchParams.get('userWallet')
    
    if (!id || !userWallet) {
      return NextResponse.json({ error: 'Sale ID and user wallet required' }, { status: 400 })
    }
    
    const user = await getUserByWallet(userWallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, что распродажа принадлежит пользователю
    const flashSale = await prisma.flashSale.findUnique({
      where: { id }
    })
    
    if (!flashSale || flashSale.creatorId !== user.id) {
      return NextResponse.json({ error: 'Flash sale not found or unauthorized' }, { status: 404 })
    }
    
    // Деактивируем распродажу
    await prisma.flashSale.update({
      where: { id },
      data: { isActive: false }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting flash sale:', error)
    return NextResponse.json({ error: 'Failed to delete flash sale' }, { status: 500 })
  }
} 