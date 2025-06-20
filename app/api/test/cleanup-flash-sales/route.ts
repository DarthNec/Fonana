import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Ищем Flash Sales пользователя yourdad...')
    
    // Находим пользователя yourdad
    const user = await prisma.user.findFirst({
      where: {
        nickname: 'yourdad'
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь yourdad не найден' 
      }, { status: 404 })
    }

    // Находим все Flash Sales этого пользователя
    const flashSales = await prisma.flashSale.findMany({
      where: {
        creatorId: user.id
      },
      include: {
        post: {
          select: {
            title: true
          }
        }
      }
    })

    if (flashSales.length > 0) {
      // Удаляем все Flash Sales
      const deleted = await prisma.flashSale.deleteMany({
        where: {
          creatorId: user.id
        }
      })

      return NextResponse.json({
        success: true,
        message: `Удалено ${deleted.count} Flash Sales`,
        deletedSales: flashSales.map((sale: any) => ({
          id: sale.id,
          postTitle: sale.post?.title,
          subscriptionPlan: sale.subscriptionPlan,
          discount: sale.discount
        }))
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Flash Sales не найдены',
      count: 0
    })

  } catch (error) {
    console.error('Error cleaning up flash sales:', error)
    return NextResponse.json({ 
      error: 'Failed to cleanup flash sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 