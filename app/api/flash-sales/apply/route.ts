import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/flash-sales/apply - применить Flash Sale к покупке
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { flashSaleId, userId, originalPrice } = body
    
    if (!flashSaleId || !userId || !originalPrice) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Начинаем транзакцию
    const result = await prisma.$transaction(async (tx: any) => {
      // Получаем Flash Sale с блокировкой для обновления
      const flashSale = await tx.flashSale.findUnique({
        where: { id: flashSaleId }
      })
      
      if (!flashSale) {
        throw new Error('Flash sale not found')
      }
      
      // Проверяем, что распродажа активна
      const now = new Date()
      if (!flashSale.isActive || 
          flashSale.endAt < now || 
          flashSale.startAt > now) {
        throw new Error('Flash sale is not active')
      }
      
      // Проверяем лимит использований
      if (flashSale.maxRedemptions && 
          flashSale.usedCount >= flashSale.maxRedemptions) {
        throw new Error('Flash sale limit reached')
      }
      
      // Проверяем, не использовал ли уже пользователь эту скидку
      const existingRedemption = await tx.flashSaleRedemption.findUnique({
        where: {
          flashSaleId_userId: {
            flashSaleId,
            userId
          }
        }
      })
      
      if (existingRedemption) {
        throw new Error('You have already used this flash sale')
      }
      
      // Вычисляем скидку
      const discountAmount = originalPrice * (flashSale.discount / 100)
      const finalPrice = originalPrice - discountAmount
      
      // Создаем запись об использовании
      const redemption = await tx.flashSaleRedemption.create({
        data: {
          flashSaleId,
          userId,
          originalPrice,
          discountAmount,
          finalPrice
        }
      })
      
      // Увеличиваем счетчик использований
      await tx.flashSale.update({
        where: { id: flashSaleId },
        data: { 
          usedCount: { increment: 1 }
        }
      })
      
      return {
        redemption,
        flashSale,
        discountApplied: discountAmount,
        finalPrice
      }
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error applying flash sale:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to apply flash sale'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

// GET /api/flash-sales/apply/check - проверить применимость Flash Sale
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flashSaleId = searchParams.get('flashSaleId')
    const userId = searchParams.get('userId')
    const price = searchParams.get('price')
    
    if (!flashSaleId || !userId || !price) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }
    
    const originalPrice = parseFloat(price)
    
    // Получаем Flash Sale
    const flashSale = await prisma.flashSale.findUnique({
      where: { id: flashSaleId },
      include: {
        redemptions: {
          where: { userId }
        }
      }
    })
    
    if (!flashSale) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'Flash sale not found' 
      })
    }
    
    // Проверяем все условия
    const now = new Date()
    
    if (!flashSale.isActive) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'Flash sale is not active' 
      })
    }
    
    if (flashSale.endAt < now) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'Flash sale has expired' 
      })
    }
    
    if (flashSale.startAt > now) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'Flash sale has not started yet' 
      })
    }
    
    if (flashSale.maxRedemptions && 
        flashSale.usedCount >= flashSale.maxRedemptions) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'Flash sale limit reached' 
      })
    }
    
    if (flashSale.redemptions.length > 0) {
      return NextResponse.json({ 
        canApply: false,
        reason: 'You have already used this flash sale' 
      })
    }
    
    // Вычисляем скидку
    const discountAmount = originalPrice * (flashSale.discount / 100)
    const finalPrice = originalPrice - discountAmount
    
    return NextResponse.json({
      canApply: true,
      flashSale: {
        id: flashSale.id,
        discount: flashSale.discount,
        endAt: flashSale.endAt
      },
      pricing: {
        originalPrice,
        discountAmount,
        finalPrice,
        discountPercentage: flashSale.discount
      }
    })
  } catch (error) {
    console.error('Error checking flash sale:', error)
    return NextResponse.json({ 
      error: 'Failed to check flash sale' 
    }, { status: 500 })
  }
} 