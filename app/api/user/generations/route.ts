import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/user/generations?userWallet=xxx
 * 
 * Получить количество доступных генераций пользователя
 * 
 * Query Parameters:
 * - userWallet: string (required) - кошелек пользователя
 * 
 * Response:
 * {
 *   success: true,
 *   availableGenerationCount: number,
 *   user: {
 *     id: string,
 *     nickname: string,
 *     wallet: string
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API/user/generations] Starting GET request')
    
    const { searchParams } = new URL(request.url)
    const userWallet = searchParams.get('userWallet')
    
    // Валидация userWallet
    if (!userWallet) {
      console.log('[API/user/generations] No userWallet provided')
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }
    /*
    // Валидация формата кошелька
    if (!/^[a-zA-Z0-9]+$/.test(userWallet)) {
      console.log('[API/user/generations] Invalid wallet format')
      return NextResponse.json(
        { error: 'Invalid wallet format' },
        { status: 400 }
      )
    }
    */
    console.log('[API/user/generations] Fetching user:', userWallet)
    
    // Ищем пользователя по wallet или solanaWallet
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: userWallet },
          { solanaWallet: userWallet }
        ]
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        availableGenerationCount: true
      }
    })
    
    if (!user) {
      console.log('[API/user/generations] User not found')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    console.log('[API/user/generations] User found:', {
      id: user.id,
      nickname: user.nickname,
      availableGenerationCount: user.availableGenerationCount
    })
    
    return NextResponse.json({
      success: true,
      availableGenerationCount: user.availableGenerationCount,
      user: {
        id: user.id,
        nickname: user.nickname || 'Unknown',
        wallet: user.wallet,
        solanaWallet: user.solanaWallet
      }
    })
    
  } catch (error) {
    console.error('[API/user/generations] GET Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch generation count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/generations
 * 
 * Обновить количество доступных генераций пользователя
 * 
 * Body:
 * {
 *   userWallet: string (required) - кошелек пользователя
 *   generationCount: number (required) - новое количество генераций (будет установлено как новое значение)
 * }
 * 
 * Альтернативно можно использовать:
 * {
 *   userWallet: string,
 *   increment: number - увеличить на N
 * }
 * или
 * {
 *   userWallet: string,
 *   decrement: number - уменьшить на N
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   availableGenerationCount: number,
 *   previousCount: number,
 *   user: {
 *     id: string,
 *     nickname: string,
 *     wallet: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API/user/generations] Starting POST request')
    
    const body = await request.json()
    const { userWallet, generationCount, increment, decrement } = body
    
    // Валидация userWallet
    if (!userWallet) {
      console.log('[API/user/generations] No userWallet provided')
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      )
    }
    
    // Валидация формата кошелька
    if (!/^[a-zA-Z0-9]+$/.test(userWallet)) {
      console.log('[API/user/generations] Invalid wallet format')
      return NextResponse.json(
        { error: 'Invalid wallet format' },
        { status: 400 }
      )
    }
    
    // Валидация параметров обновления
    const hasGenerationCount = typeof generationCount === 'number'
    const hasIncrement = typeof increment === 'number'
    const hasDecrement = typeof decrement === 'number'
    
    if (!hasGenerationCount && !hasIncrement && !hasDecrement) {
      console.log('[API/user/generations] No update parameter provided')
      return NextResponse.json(
        { error: 'generationCount, increment, or decrement is required' },
        { status: 400 }
      )
    }
    
    // Проверка, что передан только один параметр
    const providedParams = [hasGenerationCount, hasIncrement, hasDecrement].filter(Boolean).length
    if (providedParams > 1) {
      console.log('[API/user/generations] Multiple update parameters provided')
      return NextResponse.json(
        { error: 'Only one of generationCount, increment, or decrement should be provided' },
        { status: 400 }
      )
    }
    
    console.log('[API/user/generations] Fetching user:', userWallet)
    
    // Ищем пользователя
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { wallet: userWallet },
          { solanaWallet: userWallet }
        ]
      },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        availableGenerationCount: true
      }
    })
    
    if (!user) {
      console.log('[API/user/generations] User not found')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const previousCount = user.availableGenerationCount
    
    console.log('[API/user/generations] Current generation count:', previousCount)
    console.log('[API/user/generations] Update params:', {
      generationCount,
      increment,
      decrement
    })
    
    // Подготавливаем данные для обновления
    let updateData: any
    
    if (hasGenerationCount) {
      // Прямое установление значения
      if (generationCount < 0) {
        return NextResponse.json(
          { error: 'generationCount cannot be negative' },
          { status: 400 }
        )
      }
      updateData = { availableGenerationCount: generationCount }
    } else if (hasIncrement) {
      // Увеличение
      if (increment < 0) {
        return NextResponse.json(
          { error: 'increment cannot be negative' },
          { status: 400 }
        )
      }
      updateData = { availableGenerationCount: { increment } }
    } else if (hasDecrement) {
      // Уменьшение
      if (decrement < 0) {
        return NextResponse.json(
          { error: 'decrement cannot be negative' },
          { status: 400 }
        )
      }
      // Проверяем, чтобы не ушло в минус
      if (previousCount - decrement < 0) {
        return NextResponse.json(
          { 
            error: 'Cannot decrement below zero',
            currentCount: previousCount,
            requestedDecrement: decrement
          },
          { status: 400 }
        )
      }
      updateData = { availableGenerationCount: { decrement } }
    }
    
    // Обновляем пользователя
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        nickname: true,
        wallet: true,
        solanaWallet: true,
        availableGenerationCount: true
      }
    })
    
    console.log('[API/user/generations] User updated successfully:', {
      id: updatedUser.id,
      previousCount,
      newCount: updatedUser.availableGenerationCount
    })
    
    return NextResponse.json({
      success: true,
      availableGenerationCount: updatedUser.availableGenerationCount,
      previousCount,
      user: {
        id: updatedUser.id,
        nickname: updatedUser.nickname || 'Unknown',
        wallet: updatedUser.wallet,
        solanaWallet: updatedUser.solanaWallet
      },
      operation: hasGenerationCount ? 'set' : hasIncrement ? 'increment' : 'decrement'
    })
    
  } catch (error) {
    console.error('[API/user/generations] POST Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update generation count',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

