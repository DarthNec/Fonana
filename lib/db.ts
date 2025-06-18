import { PrismaClient } from '@prisma/client'
import { notifyNewPostFromSubscription } from './notifications'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Functions for working with users
export async function createOrUpdateUser(wallet: string, data?: {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}, referrerNickname?: string) {
  // Валидация и нормализация nickname
  if (data?.nickname) {
    // Защита от инъекций
    if (!/^[a-zA-Z0-9_-]+$/.test(data.nickname)) {
      throw new Error('Invalid nickname format')
    }
    
    // Проверка уникальности (case-insensitive)
    const existingUserWithNickname = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: data.nickname,
          mode: 'insensitive'
        }
      }
    })
    
    if (existingUserWithNickname) {
      // Если это не тот же пользователь
      const currentUser = await prisma.user.findFirst({
        where: {
          OR: [
            { wallet: wallet },
            { solanaWallet: wallet }
          ]
        }
      })
      
      if (!currentUser || currentUser.id !== existingUserWithNickname.id) {
        throw new Error('Nickname already taken')
      }
    }
  }
  
  // If referrer nickname is provided, try to find the referrer
  let referrerId: string | undefined
  if (referrerNickname) {
    const referrer = await prisma.user.findFirst({
      where: { 
        nickname: {
          equals: referrerNickname,
          mode: 'insensitive' // Case-insensitive поиск реферера
        }
      }
    })
    if (referrer) {
      referrerId = referrer.id
    }
  }

  // Сначала пытаемся найти пользователя по любому из полей wallet
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { wallet: wallet },
        { solanaWallet: wallet }
      ]
    }
  })

  if (existingUser) {
    // Если пользователь найден, обновляем его
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...data,
        // Обновляем оба поля wallet для консистентности
        wallet: wallet,
        solanaWallet: wallet,
        updatedAt: new Date()
      }
    })
  } else {
    // Если пользователь не найден, создаем нового
    return await prisma.user.create({
      data: {
        wallet,
        solanaWallet: wallet, // Сохраняем в оба поля
        isCreator: true,
        referrerId,
        ...data,
      }
    })
  }
}

export async function getUserByWallet(wallet: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { wallet: wallet },
        { solanaWallet: wallet }
      ]
    },
    include: {
      _count: {
        select: {
          posts: true,
          followers: true,
          follows: true,
        },
      },
    },
  })
}

export async function updateUserProfile(wallet: string, data: {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}) {
  // Сначала находим пользователя по любому из полей wallet
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { wallet: wallet },
        { solanaWallet: wallet }
      ]
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Валидация и проверка уникальности nickname
  if (data.nickname && data.nickname !== user.nickname) {
    // Защита от инъекций
    if (!/^[a-zA-Z0-9_-]+$/.test(data.nickname)) {
      throw new Error('Invalid nickname format')
    }
    
    // Проверка уникальности (case-insensitive)
    const existingUserWithNickname = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: data.nickname,
          mode: 'insensitive'
        },
        NOT: {
          id: user.id
        }
      }
    })
    
    if (existingUserWithNickname) {
      throw new Error('Nickname already taken')
    }
  }

  // Фильтруем undefined значения - обновляем только те поля, которые явно переданы
  const cleanData: any = {}
  Object.keys(data).forEach(key => {
    if (data[key as keyof typeof data] !== undefined) {
      cleanData[key] = data[key as keyof typeof data]
    }
  })

  // Если обновляется fullName, также обновляем name для совместимости
  if (cleanData.fullName) {
    cleanData.name = cleanData.fullName
  }

  return await prisma.user.update({
    where: { id: user.id },
    data: {
      ...cleanData,
      updatedAt: new Date(),
    },
  })
}

// Delete user and all related data
export async function deleteUser(wallet: string) {
  const user = await getUserByWallet(wallet)
  if (!user) throw new Error('User not found')

  // Use transaction to delete all related data
  await prisma.$transaction(async (tx: any) => {
    // Delete user likes
    await tx.like.deleteMany({
      where: { userId: user.id }
    })

    // Delete user comments
    await tx.comment.deleteMany({
      where: { userId: user.id }
    })

    // Delete user subscriptions (and to them)
    await tx.subscription.deleteMany({
      where: { 
        OR: [
          { userId: user.id },
          { creatorId: user.id }
        ]
      }
    })

    // Delete follower connections
    await tx.follow.deleteMany({
      where: { 
        OR: [
          { followerId: user.id },
          { followingId: user.id }
        ]
      }
    })

    // Delete user post tags
    await tx.postTag.deleteMany({
      where: { 
        post: { creatorId: user.id }
      }
    })

    // Delete user posts
    await tx.post.deleteMany({
      where: { creatorId: user.id }
    })

    // Finally, delete the user
    await tx.user.delete({
      where: { wallet }
    })
  })

  return { success: true }
}

// Functions for working with posts
export async function createPost(creatorWallet: string, data: {
  title: string
  content: string
  type: string
  category?: string
  thumbnail?: string
  mediaUrl?: string
  isLocked?: boolean
  isPremium?: boolean
  price?: number
  currency?: string
  tags?: string[]
  tier?: string
  // Новые поля для продаваемых постов
  isSellable?: boolean
  sellType?: 'FIXED_PRICE' | 'AUCTION'
  sellPrice?: number
  quantity?: number  // Количество товара
  auctionStartPrice?: number
  auctionStepPrice?: number
  auctionDuration?: number
  auctionDepositAmount?: number
}) {
  const creator = await getUserByWallet(creatorWallet)
  if (!creator) throw new Error('Creator not found')
  
  // Валидация для платных постов
  if (data.tier === 'paid' && (!data.price || data.price <= 0)) {
    throw new Error('Price is required for paid posts')
  }

  // Map tier values to minSubscriptionTier
  let minSubscriptionTier: string | undefined
  if (data.tier) {
    switch (data.tier) {
      case 'free':
        minSubscriptionTier = undefined // Free posts don't have subscription requirement
        break
      case 'subscribers':
      case 'basic':
        minSubscriptionTier = 'basic' // Basic tier and above
        break
      case 'standard':
        minSubscriptionTier = 'standard' // Standard tier and above
        break
      case 'premium':
        minSubscriptionTier = 'premium' // Premium tier and above
        break
      case 'vip':
        minSubscriptionTier = 'vip' // VIP tier only
        break
      case 'paid':
        minSubscriptionTier = undefined // Paid posts use price, not tier
        break
      default:
        minSubscriptionTier = undefined
    }
  }

  // Вычисляем даты для аукциона
  let auctionStartAt: Date | undefined
  let auctionEndAt: Date | undefined
  let auctionStatus: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | undefined
  
  if (data.isSellable && data.sellType === 'AUCTION' && data.auctionDuration) {
    auctionStartAt = new Date()
    auctionEndAt = new Date(auctionStartAt.getTime() + data.auctionDuration * 60 * 60 * 1000)
    auctionStatus = 'ACTIVE'
  }

  const post = await prisma.post.create({
    data: {
      creatorId: creator.id,
      title: data.title,
      content: data.content,
      type: data.type,
      category: data.category,
      thumbnail: data.thumbnail,
      mediaUrl: data.mediaUrl,
      isLocked: data.isLocked || false,
      isPremium: data.isPremium || false,
      price: data.price,
      currency: data.currency || 'SOL',
      minSubscriptionTier: minSubscriptionTier,
      // Новые поля для продаваемых постов
      isSellable: data.isSellable || false,
      sellType: data.isSellable ? data.sellType : undefined,
      quantity: data.isSellable ? (data.quantity || 1) : undefined,
      auctionStartPrice: data.isSellable && data.sellType === 'AUCTION' ? data.auctionStartPrice : undefined,
      auctionStepPrice: data.isSellable && data.sellType === 'AUCTION' ? data.auctionStepPrice : undefined,
      auctionDepositAmount: data.isSellable && data.sellType === 'AUCTION' ? data.auctionDepositAmount : undefined,
      auctionStartAt,
      auctionEndAt,
      auctionStatus: data.isSellable ? (data.sellType === 'AUCTION' ? auctionStatus : 'DRAFT') : undefined,
      // Поле price уже установлено выше, дополнительная логика не нужна
      tags: data.tags ? {
        create: data.tags.map(tagName => ({
          tag: {
            connectOrCreate: {
              where: { name: tagName },
              create: { name: tagName },
            },
          },
        })),
      } : undefined,
    },
    include: {
      creator: true,
      tags: {
        include: { tag: true },
      },
    },
  })

  // Отправляем уведомления подписчикам о новом посте
  // Только если пост не платный (платные посты не показываем в уведомлениях)
  if (!data.price || data.price === 0) {
    try {
      // Получаем всех активных подписчиков создателя
      const subscriptions = await prisma.subscription.findMany({
        where: {
          creatorId: creator.id,
          isActive: true,
          validUntil: { gte: new Date() }
        },
        include: {
          user: {
            include: {
              settings: true
            }
          }
        }
      })

      // Отправляем уведомление каждому подписчику
      const creatorName = creator.fullName || creator.nickname || 'A creator'
      
      for (const subscription of subscriptions) {
        // Проверяем настройки уведомлений пользователя
        if (!subscription.user.settings || subscription.user.settings.notifyNewPosts) {
          await notifyNewPostFromSubscription(
            subscription.userId,
            creatorName,
            post.title,
            post.id
          ).catch(error => {
            // Не прерываем процесс, если не удалось отправить одно уведомление
            console.error('Failed to send notification:', error)
          })
        }
      }
    } catch (error) {
      // Логируем ошибку, но не прерываем процесс создания поста
      console.error('Error sending notifications:', error)
    }
  }

  return post
}

export async function getPosts(options?: {
  creatorId?: string
  isLocked?: boolean
  limit?: number
  offset?: number
}) {
  return await prisma.post.findMany({
    where: {
      creatorId: options?.creatorId,
      isLocked: options?.isLocked,
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    skip: options?.offset || 0,
    include: {
      creator: true,
      tags: {
        include: { tag: true },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  })
}

export async function getPostsByCreator(creatorId: string, options?: {
  limit?: number
  offset?: number
}) {
  const limit = options?.limit || 20
  const offset = options?.offset || 0

  return await prisma.post.findMany({
    where: { creatorId },
    include: {
      creator: true,
      tags: {
        include: { tag: true },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

export async function getAllPosts(options?: {
  limit?: number
  offset?: number
}) {
  const limit = options?.limit || 20
  const offset = options?.offset || 0

  return await prisma.post.findMany({
    include: {
      creator: true,
      tags: {
        include: { tag: true },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

export async function getPostById(postId: string) {
  return await prisma.post.findUnique({
    where: { id: postId },
    include: {
      creator: true,
      tags: {
        include: { tag: true },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        }
      }
    },
  })
}

// Functions for working with subscriptions
export async function createSubscription(userWallet: string, creatorWallet: string, data: {
  plan: string
  price: number
  validUntil: Date
  txSignature?: string
}) {
  const [user, creator] = await Promise.all([
    getUserByWallet(userWallet),
    getUserByWallet(creatorWallet),
  ])

  if (!user || !creator) throw new Error('User or creator not found')

  return await prisma.subscription.create({
    data: {
      userId: user.id,
      creatorId: creator.id,
      plan: data.plan,
      price: data.price,
      validUntil: data.validUntil,
      txSignature: data.txSignature,
    },
  })
}

export async function getUserSubscriptions(userWallet: string) {
  const user = await getUserByWallet(userWallet)
  if (!user) return []

  return await prisma.subscription.findMany({
    where: {
      userId: user.id,
      isActive: true,
      validUntil: { gte: new Date() },
    },
    include: {
      user: false,
    },
  })
}

// Check subscription
export async function hasActiveSubscription(userWallet: string, creatorWallet: string): Promise<boolean> {
  const [user, creator] = await Promise.all([
    getUserByWallet(userWallet),
    getUserByWallet(creatorWallet),
  ])

  if (!user || !creator) return false

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      creatorId: creator.id,
      isActive: true,
      validUntil: { gte: new Date() },
    },
  })

  return !!subscription
} 