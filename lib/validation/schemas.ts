import { z } from 'zod'

// 🔒 ENTERPRISE SECURITY: Input validation schemas

// Search query validation with security patterns
export const SearchQuerySchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s\-_.@#]+$/, 'Invalid characters in search query')
    .transform(str => str.trim()), // Sanitize whitespace
  filters: z.array(z.string()).optional().default([]),
  page: z.number().min(1, 'Page must be at least 1').max(100, 'Page too high').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(50, 'Limit too high').default(20)
})

// Creator filter validation
export const CreatorFilterSchema = z.object({
  category: z.enum(['All', 'Art', 'Music', 'Gaming', 'Lifestyle', 'Fitness', 'Tech', 'DeFi', 'NFT', 'Trading', 'GameFi', 'Blockchain', 'Intimate', 'Education', 'Comedy'])
    .default('All'),
  sortBy: z.enum(['latest', 'popular', 'trending', 'subscribed'])
    .default('latest')
})

// User ID validation (for API calls)
export const UserIdSchema = z.string()
  .min(1, 'User ID is required')
  .max(100, 'User ID too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid user ID format')

// Wallet address validation
export const WalletAddressSchema = z.string()
  .min(32, 'Wallet address too short')
  .max(44, 'Wallet address too long')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid wallet address format')

// Message content validation
export const MessageContentSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(2000, 'Message too long')
    .transform(str => str.trim()),
  recipientId: z.string()
    .min(1, 'Recipient ID is required')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid recipient ID'),
  mediaType: z.enum(['text', 'image', 'video', 'audio']).optional(),
  isPaid: z.boolean().default(false)
})

// Creator subscription validation
export const SubscriptionSchema = z.object({
  creatorId: z.string()
    .min(1, 'Creator ID is required')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid creator ID'),
  tier: z.enum(['Free', 'Basic', 'Premium', 'VIP']).default('Free'),
  duration: z.number().min(1, 'Duration must be at least 1').max(365, 'Duration too long').optional()
})

// Post creation validation
export const PostCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform(str => str.trim()),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content too long')
    .transform(str => str.trim()),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category too long'),
  tags: z.array(z.string().max(30, 'Tag too long')).max(10, 'Too many tags').optional().default([]),
  isPublic: z.boolean().default(true),
  price: z.number().min(0, 'Price cannot be negative').max(1000, 'Price too high').optional()
})

// API response validation helpers
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

// Creators API response validation
export const CreatorsApiResponseSchema = z.object({
  creators: z.array(z.object({
    id: z.string(),
    nickname: z.string().optional(),
    fullName: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    verified: z.boolean().optional().default(false)
  }))
})

// Type exports for TypeScript
export type SearchQuery = z.infer<typeof SearchQuerySchema>
export type CreatorFilter = z.infer<typeof CreatorFilterSchema>
export type MessageContent = z.infer<typeof MessageContentSchema>
export type Subscription = z.infer<typeof SubscriptionSchema>
export type PostCreate = z.infer<typeof PostCreateSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>
export type CreatorsApiResponse = z.infer<typeof CreatorsApiResponseSchema>

// 🔒 ENTERPRISE VALIDATION UTILITIES

// Safe validation wrapper that logs errors
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown, context: string): T | null => {
  try {
    const result = schema.parse(data)
    console.info(`[VALIDATION SUCCESS] ${context}:`, { 
      valid: true, 
      dataType: typeof data 
    })
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(`[VALIDATION ERROR] ${context}:`, {
        errors: error.errors,
        data: data
      })
    } else {
      console.error(`[VALIDATION CRITICAL] ${context}:`, error)
    }
    return null
  }
}

// Validation middleware for API routes
export const validateInput = <T>(schema: z.ZodSchema<T>, context: string) => {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        console.warn(`[API VALIDATION] ${context} failed:`, errors)
        return { success: false, errors }
      }
      
      console.error(`[API VALIDATION CRITICAL] ${context}:`, error)
      return { success: false, errors: ['Invalid input format'] }
    }
  }
}

// Query parameter sanitization
export const sanitizeQueryParams = (params: Record<string, any>): Record<string, string> => {
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/[<>"\';()&+]/g, '') // Remove HTML/SQL injection chars
        .trim()
        .slice(0, 200) // Limit length
    } else if (typeof value === 'number') {
      sanitized[key] = value.toString()
    }
  }
  
  return sanitized
} 