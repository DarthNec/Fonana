import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/wheel/reward
 * 
 * Начисление наград за выигрыш в лотерее
 * 
 * Body:
 * - wallet: string (required) - Адрес кошелька пользователя
 * - prize: string (required) - Название приза ("Extra Generation", "Premium Post", "Try next time")
 * 
 * Response:
 * - 200: { success: true, reward: { type, description, value }, user: { availableGenerationCount } }
 * - 400: { error: "Wallet is required" | "Prize is required" | "Invalid prize" }
 * - 404: { error: "User not found" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, prize } = body

    // Валидация
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet is required' },
        { status: 400 }
      )
    }

    if (!prize) {
      return NextResponse.json(
        { error: 'Prize is required' },
        { status: 400 }
      )
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { wallet: wallet },
      select: {
        id: true,
        nickname: true,
        wallet: true,
        availableGenerationCount: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ✅ Обработка наград по типу приза
    let rewardResult: {
      type: string
      description: string
      value: number | null
      post?: any
    } = {
      type: prize,
      description: '',
      value: null
    }

    switch (prize) {
      case '✨ Extra Generation':
        // ✅ Увеличиваем availableGenerationCount на 1
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            availableGenerationCount: {
              increment: 1
            }
          },
          select: {
            availableGenerationCount: true
          }
        })

        rewardResult = {
          type: 'Extra Generation',
          description: 'You received 1 additional Sora 2 generation! Create amazing AI videos.',
          value: 1
        }

        console.log(`[Wheel Reward] User ${user.id} received Extra Generation. New count: ${updatedUser.availableGenerationCount}`)

        return NextResponse.json({
          success: true,
          reward: rewardResult,
          user: {
            availableGenerationCount: updatedUser.availableGenerationCount
          }
        })

      case '💎 Premium Post':
        // ✅ Получаем существующие покупки пользователя
        const existingPurchases = await prisma.postPurchase.findMany({
          where: { userId: user.id },
          select: { postId: true }
        })
        
        const excludedPostIds = existingPurchases.map(p => p.postId)
        
        console.log(`[Wheel Reward] User ${user.id} has ${excludedPostIds.length} existing purchases`)
        
        // ✅ Читаем платные посты из локального файла (НЕ из БД!)
        const paidPostsPath = path.join(process.cwd(), 'paid_posts.json')
        let paidPostsData: any
        
        try {
          const fileContent = fs.readFileSync(paidPostsPath, 'utf-8')
          paidPostsData = JSON.parse(fileContent)
        } catch (fileError) {
          console.error('[Wheel Reward] Failed to read paid_posts.json:', fileError)
          return NextResponse.json({
            error: 'Failed to load paid posts data',
            success: false
          }, { status: 500 })
        }
        
        // ✅ Фильтруем посты, которые пользователь еще не купил
        const availablePosts = paidPostsData.posts.filter(
          (post: any) => !excludedPostIds.includes(post.id)
        )
        
        if (availablePosts.length === 0) {
          console.log(`[Wheel Reward] No available posts for user ${user.id}`)
          return NextResponse.json({
            error: 'No available posts to reward. All posts have been purchased.',
            success: false
          }, { status: 400 })
        }
        
        console.log(`[Wheel Reward] Found ${availablePosts.length} available posts from file`)
        
        // ✅ Выбираем случайный пост
        const randomIndex = Math.floor(Math.random() * availablePosts.length)
        const selectedPost = availablePosts[randomIndex]
        
        console.log(`[Wheel Reward] Selected post ${selectedPost.id} for user ${user.id}`)
        
        // ✅ Создаем PostPurchase запись (БЕЗ реальной транзакции)
        try {
          await prisma.postPurchase.create({
            data: {
              postId: selectedPost.id,
              userId: user.id,
              price: 0,  // Награда бесплатна
              currency: 'SOL',
              txSignature: 'LOTTERY_REWARD',  // Специальный маркер
              paymentStatus: 'COMPLETED',
              platformFee: 0,
              referrerFee: 0,
              creatorAmount: 0
            }
          })
          
          console.log(`[Wheel Reward] PostPurchase created for user ${user.id}, post ${selectedPost.id}`)
        } catch (dbError) {
          console.error('[Wheel Reward] Database error creating PostPurchase:', dbError)
          return NextResponse.json({
            error: 'Failed to create purchase record',
            success: false
          }, { status: 500 })
        }
        
        // ✅ Возвращаем информацию о выигранном посте (используем данные из файла)
        rewardResult = {
          type: 'Premium Post',
          description: `You won access to a premium post by ${selectedPost.creator.nickname || selectedPost.creator.fullName}!`,
          value: 1,
          post: {
            id: selectedPost.id,
            content: selectedPost.content || '',
            mediaUrl: selectedPost.mediaUrl || '',
            type: selectedPost.type,
            price: selectedPost.price,
            creator: {
              id: selectedPost.creator.id,
              nickname: selectedPost.creator.nickname,
              fullName: selectedPost.creator.fullName
            }
          }
        }
        
        return NextResponse.json({
          success: true,
          reward: rewardResult,
          user: {
            availableGenerationCount: user.availableGenerationCount
          }
        })

      case '❌ Try next time':
        // Нет награды
        rewardResult = {
          type: 'Try next time',
          description: 'Better luck next time! Spin again to win prizes.',
          value: null
        }

        console.log(`[Wheel Reward] User ${user.id} got "Try next time"`)

        return NextResponse.json({
          success: true,
          reward: rewardResult,
          user: {
            availableGenerationCount: user.availableGenerationCount
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid prize type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[API] Error processing wheel reward:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
