/**
 * Централизованная система валидации через Zod
 * Защищает все API маршруты и формы от некорректных данных
 */

import { z } from 'zod'

// ===== БАЗОВЫЕ СХЕМЫ =====

// Solana адрес кошелька
export const walletSchema = z
  .string()
  .min(32, 'Wallet address must be at least 32 characters')
  .max(44, 'Wallet address must be at most 44 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Wallet address must contain only alphanumeric characters')

// UUID для ID
export const idSchema = z
  .string()
  .uuid('Invalid ID format')

// Email (опционально)
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .optional()

// Никнейм пользователя
export const nicknameSchema = z
  .string()
  .min(2, 'Nickname must be at least 2 characters')
  .max(30, 'Nickname must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Nickname can only contain letters, numbers, and underscores')

// Полное имя
export const fullNameSchema = z
  .string()
  .min(2, 'Full name must be at least 2 characters')
  .max(100, 'Full name must be at most 100 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')

// Биография
export const bioSchema = z
  .string()
  .max(500, 'Bio must be at most 500 characters')
  .optional()

// URL изображения
export const imageUrlSchema = z
  .string()
  .url('Invalid image URL')
  .optional()

// Тиры подписки
export const tierSchema = z.enum(['free', 'basic', 'premium', 'vip'])

// Цена в SOL
export const solPriceSchema = z
  .number()
  .positive('Price must be positive')
  .max(1000, 'Price cannot exceed 1000 SOL')

// Цена в USD
export const usdPriceSchema = z
  .number()
  .positive('Price must be positive')
  .max(100000, 'Price cannot exceed $100,000')

// ===== API СХЕМЫ =====

// Создание/обновление пользователя
export const userCreateSchema = z.object({
  wallet: walletSchema,
  nickname: nicknameSchema.optional(),
  fullName: fullNameSchema.optional(),
  email: emailSchema,
  bio: bioSchema,
  avatar: imageUrlSchema,
  backgroundImage: imageUrlSchema
})

export const userUpdateSchema = userCreateSchema.partial()

// Лайк поста
export const likePostSchema = z.object({
  postId: idSchema,
  userId: idSchema.optional()
})

// Комментарий
export const commentSchema = z.object({
  postId: idSchema,
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be at most 1000 characters'),
  userId: idSchema.optional()
})

// Покупка поста
export const purchasePostSchema = z.object({
  postId: idSchema,
  userId: idSchema,
  amount: solPriceSchema
})

// Подписка на создателя
export const subscriptionSchema = z.object({
  creatorId: idSchema,
  userId: idSchema,
  tier: tierSchema,
  amount: solPriceSchema
})

// Создание поста
export const postCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be at most 200 characters'),
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be at most 10,000 characters'),
  imageUrl: imageUrlSchema.optional(),
  minSubscriptionTier: tierSchema.optional(),
  price: solPriceSchema.optional(),
  isAuction: z.boolean().optional(),
  auctionEndTime: z.date().optional(),
  quantity: z.number().positive().optional()
})

// Обновление поста
export const postUpdateSchema = postCreateSchema.partial()

// Flash Sale
export const flashSaleSchema = z.object({
  postId: idSchema,
  discountPercentage: z
    .number()
    .min(1, 'Discount must be at least 1%')
    .max(90, 'Discount cannot exceed 90%'),
  endTime: z.date().refine(date => date > new Date(), 'End time must be in the future'),
  maxQuantity: z.number().positive().optional()
})

// Сообщение
export const messageSchema = z.object({
  recipientId: idSchema,
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be at most 2000 characters'),
  isPPV: z.boolean().optional(),
  price: solPriceSchema.optional()
})

// Уведомление
export const notificationSchema = z.object({
  userId: idSchema,
  type: z.enum(['like', 'comment', 'purchase', 'subscription', 'message', 'system']),
  title: z.string().max(100),
  message: z.string().max(500),
  data: z.record(z.any()).optional()
})

// ===== ФОРМЫ =====

// Форма профиля
export const profileFormSchema = z.object({
  nickname: nicknameSchema,
  fullName: fullNameSchema,
  email: emailSchema,
  bio: bioSchema
})

// Форма создания поста
export const createPostFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  minSubscriptionTier: tierSchema.optional(),
  price: z.number().positive().optional(),
  isAuction: z.boolean().default(false),
  auctionEndTime: z.date().optional(),
  quantity: z.number().positive().optional()
})

// Форма поиска
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must be at most 100 characters'),
  category: z.string().optional(),
  tier: tierSchema.optional(),
  sortBy: z.enum(['newest', 'oldest', 'popular', 'price']).optional()
})

// ===== УТИЛИТЫ ВАЛИДАЦИИ =====

/**
 * Безопасная валидация с обработкой ошибок
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const errorMessage = result.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errorMessage }
    }
  } catch (error) {
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Валидация API запроса
 */
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errorMessage = result.error.errors.map(e => e.message).join(', ')
    throw new Error(`Validation error: ${errorMessage}`)
  }
  return result.data
}

/**
 * Санитизация строки (удаление опасных символов)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Удаляем < и >
    .replace(/javascript:/gi, '') // Удаляем javascript:
    .replace(/on\w+=/gi, '') // Удаляем on* события
}

/**
 * Валидация и санитизация HTML контента
 */
export function sanitizeHtmlContent(content: string): string {
  const sanitized = sanitizeString(content)
  
  // Разрешаем только безопасные HTML теги
  const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span']
  const allowedAttributes = ['class', 'style']
  
  // Простая санитизация (в продакшене лучше использовать DOMPurify)
  return sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
}

/**
 * Валидация файла изображения
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 100MB' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF files are allowed' }
  }
  
  return { valid: true }
}

/**
 * Валидация URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Валидация Solana адреса
 */
export function validateSolanaAddress(address: string): boolean {
  return walletSchema.safeParse(address).success
}

// ===== ТИПЫ =====

export type UserCreate = z.infer<typeof userCreateSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type LikePost = z.infer<typeof likePostSchema>
export type Comment = z.infer<typeof commentSchema>
export type PurchasePost = z.infer<typeof purchasePostSchema>
export type Subscription = z.infer<typeof subscriptionSchema>
export type PostCreate = z.infer<typeof postCreateSchema>
export type PostUpdate = z.infer<typeof postUpdateSchema>
export type FlashSale = z.infer<typeof flashSaleSchema>
export type Message = z.infer<typeof messageSchema>
export type Notification = z.infer<typeof notificationSchema>
export type ProfileForm = z.infer<typeof profileFormSchema>
export type CreatePostForm = z.infer<typeof createPostFormSchema>
export type Search = z.infer<typeof searchSchema> 