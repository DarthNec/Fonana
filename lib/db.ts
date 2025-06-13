import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Функции для работы с пользователями
export async function createOrUpdateUser(wallet: string, data?: {
  nickname?: string
  fullName?: string
  bio?: string
  avatar?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}) {
  return await prisma.user.upsert({
    where: { wallet },
    update: data ? { ...data, updatedAt: new Date() } : {},
    create: {
      wallet,
      ...data,
    },
  })
}

export async function getUserByWallet(wallet: string) {
  return prisma.user.findUnique({
    where: { wallet },
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
  website?: string
  twitter?: string
  telegram?: string
  location?: string
}) {
  return await prisma.user.update({
    where: { wallet },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })
}

// Удаление пользователя и всех связанных данных
export async function deleteUser(wallet: string) {
  const user = await getUserByWallet(wallet)
  if (!user) throw new Error('User not found')

  // Используем транзакцию для удаления всех связанных данных
  await prisma.$transaction(async (tx: any) => {
    // Удаляем лайки пользователя
    await tx.like.deleteMany({
      where: { userId: user.id }
    })

    // Удаляем комментарии пользователя
    await tx.comment.deleteMany({
      where: { userId: user.id }
    })

    // Удаляем подписки пользователя (и на него)
    await tx.subscription.deleteMany({
      where: { 
        OR: [
          { userId: user.id },
          { creatorId: user.id }
        ]
      }
    })

    // Удаляем связи подписчиков
    await tx.follow.deleteMany({
      where: { 
        OR: [
          { followerId: user.id },
          { followingId: user.id }
        ]
      }
    })

    // Удаляем теги постов пользователя
    await tx.postTag.deleteMany({
      where: { 
        post: { creatorId: user.id }
      }
    })

    // Удаляем посты пользователя
    await tx.post.deleteMany({
      where: { creatorId: user.id }
    })

    // Наконец, удаляем самого пользователя
    await tx.user.delete({
      where: { wallet }
    })
  })

  return { success: true }
}

// Функции для работы с постами
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
}) {
  const creator = await getUserByWallet(creatorWallet)
  if (!creator) throw new Error('Creator not found')

  return await prisma.post.create({
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

// Функции для подписок
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

// Проверка подписки
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