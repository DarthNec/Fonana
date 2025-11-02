// types/posts/index.ts
// Унифицированные типы для системы постов Fonana

/**
 * Информация о создателе поста
 */
export interface PostCreator {
  id: string
  name: string
  username: string
  nickname?: string
  avatar: string | null
  isVerified: boolean
}

/**
 * Контент поста
 */
export interface PostContent {
  title: string
  text: string
  category?: string
  tags: string[]
}

/**
 * Медиа контент поста
 */
export interface PostMedia {
  type: 'text' | 'image' | 'video' | 'audio' | 'ai-video'
  url?: string
  thumbnail?: string
  preview?: string
  aspectRatio?: 'vertical' | 'square' | 'horizontal'
  error?: string | null
  requestId?: string
}

/**
 * Информация о доступе к посту
 */
export interface PostAccess {
  /** Заблокирован ли пост */
  isLocked: boolean
  /** Требуемый тир подписки для доступа */
  tier?: 'basic' | 'premium' | 'vip'
  /** Цена для платного поста */
  price?: number
  /** Валюта цены */
  currency: string
  /** Куплен ли пост пользователем */
  isPurchased: boolean
  /** Подписан ли пользователь на автора */
  isSubscribed: boolean
  /** Текущий тир подписки пользователя */
  userTier?: string
  /** Нужно ли скрывать контент */
  shouldHideContent: boolean
  /** Является ли пользователь автором поста */
  isCreatorPost?: boolean
  /** Есть ли доступ к посту */
  hasAccess?: boolean
  /** Нужно ли размывать контент с overlay */
  shouldBlur?: boolean
  /** Нужно ли затемнять контент без overlay */
  shouldDim?: boolean // [tier_access_visual_fix_2025_017]
  /** Сообщение для апгрейда */
  upgradePrompt?: string
  /** Требуемый тир для доступа */
  requiredTier?: string
}

/**
 * Данные об аукционе
 */
export interface AuctionData {
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SOLD' | 'CANCELLED' | 'EXPIRED'
  startPrice?: number
  stepPrice?: number
  currentBid?: number
  depositAmount?: number
  startAt?: string
  endAt?: string
}

/**
 * Данные о Flash Sale
 */
export interface FlashSaleData {
  id: string
  discount: number // процент скидки (10-90)
  endAt: string
  maxRedemptions?: number
  usedCount: number
  remainingRedemptions?: number
  timeLeft: number // секунды до окончания
}

/**
 * Коммерческая информация поста
 */
export interface PostCommerce {
  isSellable: boolean
  sellType?: 'FIXED_PRICE' | 'AUCTION'
  quantity?: number
  soldAt?: string
  soldTo?: PostCreator
  soldPrice?: number
  auctionData?: AuctionData
  flashSale?: FlashSaleData
}

/**
 * Вовлеченность пользователей
 */
export interface PostEngagement {
  likes: number
  comments: number
  views: number
  isLiked?: boolean
}

/**
 * Эмоция на посте
 */
export interface PostEmotion {
  id: string
  emotionId: number
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
}

/**
 * Унифицированный интерфейс поста
 */
export interface UnifiedPost {
  id: string
  creator: PostCreator
  content: PostContent
  media: PostMedia
  access: PostAccess
  commerce?: PostCommerce
  engagement: PostEngagement
  createdAt: string
  updatedAt: string
  emotionsCount: number
  // [remix_carousel_fix_2025_025] Добавлено для поддержки карусели ремиксов
  /**
   * ID оригинального поста, если этот пост является ремиксом
   * null или undefined для оригинальных постов
   */
  remixId?: string | null
  
  /**
   * Количество ремиксов этого поста (опционально)
   * Используется для определения, нужно ли показывать карусель
   * для оригинального поста
   */
  hasRemixesCount?: number
  
  /**
   * Массив ремиксов из Redis кеша
   * Загружается для видео постов с requestId
   */
  postRemixes?: UnifiedPost[]
  
  /**
   * Массив эмоций на посте
   */
  emotions?: PostEmotion[]
  
  /**
   * Эмоция текущего пользователя на посте (если есть)
   */
  userEmotion?: PostEmotion
}

/**
 * Типы действий с постом
 */
export type PostActionType = 
  | 'like' 
  | 'unlike' 
  | 'comment' 
  | 'share' 
  | 'subscribe' 
  | 'purchase' 
  | 'bid'
  | 'edit'
  | 'delete'
  | 'bookmark'
  | 'report'
  | 'remix_created'
  | 'add-emotion'
  | 'remove-emotion'

/**
 * Действие с постом
 */
export interface PostAction {
  type: PostActionType
  postId: string
  data?: any
  emotionId?: number // Для add-emotion и remove-emotion
  post?: UnifiedPost // Для remix_created и других действий, которые создают новые посты
}

/**
 * Варианты отображения PostCard
 */
export type PostCardVariant = 'full' | 'compact' | 'minimal'

/**
 * Варианты страниц где отображаются посты
 */
export type PostPageVariant = 'feed' | 'profile' | 'creator' | 'search' | 'dashboard'

/**
 * Типы layout для контейнера постов
 */
export type PostLayoutType = 'list' | 'grid' | 'gallery' | 'masonry'

/**
 * Ответ сервера со списком постов
 */
export interface PostsResponse {
  posts: UnifiedPost[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * Информация о создателе для API ответов
 */
export interface PostCreatorAPI {
  id: string
  nickname: string
  avatar: string | null
  fullName: string | null
}

/**
 * Пост для API ответов
 */
export interface PostAPI {
  id: string
  title: string
  content: string
  type: string
  category: string | null
  thumbnail: string | null
  mediaUrl: string | null
  requestId: string | null
  isLocked: boolean
  minSubscriptionTier: string | null
  remixId: string | null
  createdAt: string
  updatedAt: string
  creator: PostCreatorAPI
  likesCount: number
  commentsCount: number
}

/**
 * Запрос группы ремиксов
 */
export interface RemixGroupRequest {
  postId: string
  includeOriginal?: boolean
  limit?: number
  offset?: number
}

/**
 * Ответ группы ремиксов
 */
export interface RemixGroupResponse {
  success: boolean
  data: {
    originalPost: PostAPI
    remixes: PostAPI[]
    totalCount: number
    hasMore: boolean
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
  error?: string
}

/**
 * Запрос ремиксов поста
 */
export interface RemixesRequest {
  id: string
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'likesCount' | 'viewsCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Ответ ремиксов поста
 */
export interface RemixesResponse {
  success: boolean
  data: {
    remixes: PostAPI[]
    totalCount: number
    hasMore: boolean
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
  error?: string
}

/**
 * Ошибка API
 */
export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
} 