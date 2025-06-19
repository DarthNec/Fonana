import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Поиск авторов с постами...')
    
    // Находим автора с постами
    const creatorWithPosts = await prisma.user.findFirst({
      where: {
        isCreator: true,
        posts: {
          some: {
            isLocked: true,
            price: {
              gt: 0
            }
          }
        }
      },
      include: {
        posts: {
          where: {
            isLocked: true,
            price: {
              gt: 0
            }
          },
          take: 1
        }
      }
    })

    if (!creatorWithPosts || !creatorWithPosts.posts.length) {
      return NextResponse.json({ 
        error: 'Не найдено авторов с платными постами' 
      }, { status: 404 })
    }

    const post = creatorWithPosts.posts[0]
    
    // Создаем Flash Sale на 50% скидку на 24 часа
    const flashSale = await prisma.flashSale.create({
      data: {
        creatorId: creatorWithPosts.id,
        postId: post.id,
        discount: 50, // 50% скидка
        maxRedemptions: 10, // Максимум 10 использований
        startAt: new Date(),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
        isActive: true
      }
    })

    // Создаем еще одну Flash Sale на подписку
    const subscriptionFlashSale = await prisma.flashSale.create({
      data: {
        creatorId: creatorWithPosts.id,
        subscriptionPlan: 'basic',
        discount: 30, // 30% скидка на базовую подписку
        maxRedemptions: 20,
        startAt: new Date(),
        endAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 часов
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      postFlashSale: {
        id: flashSale.id,
        postId: post.id,
        postTitle: post.title,
        creatorName: creatorWithPosts.nickname,
        discount: flashSale.discount,
        endAt: flashSale.endAt,
        maxRedemptions: flashSale.maxRedemptions,
        postUrl: `https://fonana.me/post/${post.id}`
      },
      subscriptionFlashSale: {
        id: subscriptionFlashSale.id,
        creatorId: creatorWithPosts.id,
        creatorName: creatorWithPosts.nickname,
        plan: subscriptionFlashSale.subscriptionPlan,
        discount: subscriptionFlashSale.discount,
        endAt: subscriptionFlashSale.endAt,
        profileUrl: `https://fonana.me/creator/${creatorWithPosts.id}`
      }
    })

  } catch (error) {
    console.error('Error creating test flash sale:', error)
    return NextResponse.json({ 
      error: 'Failed to create flash sale',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 