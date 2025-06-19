import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const flashSales = await prisma.flashSale.findMany({
      where: {
        isActive: true,
        endAt: {
          gt: new Date()
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            fullName: true
          }
        },
        post: {
          select: {
            id: true,
            title: true,
            price: true
          }
        },
        redemptions: {
          select: {
            id: true,
            userId: true,
            redeemedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedSales = flashSales.map((sale: any) => ({
      id: sale.id,
      type: sale.postId ? 'post' : 'subscription',
      creator: sale.creator ? {
        id: sale.creator.id,
        name: sale.creator.fullName || sale.creator.nickname
      } : null,
      post: sale.post ? {
        id: sale.post.id,
        title: sale.post.title,
        originalPrice: sale.post.price,
        discountedPrice: sale.post.price ? sale.post.price * (1 - sale.discount / 100) : 0
      } : null,
      subscriptionPlan: sale.subscriptionPlan,
      discount: sale.discount,
      usedCount: sale.redemptions.length,
      maxRedemptions: sale.maxRedemptions,
      startAt: sale.startAt,
      endAt: sale.endAt,
      remainingTime: sale.endAt.getTime() - new Date().getTime(),
      isActive: sale.isActive
    }))

    return NextResponse.json({
      success: true,
      count: formattedSales.length,
      flashSales: formattedSales
    })

  } catch (error) {
    console.error('Error listing flash sales:', error)
    return NextResponse.json({ 
      error: 'Failed to list flash sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 