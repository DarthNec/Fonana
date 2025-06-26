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
  type: 'text' | 'image' | 'video' | 'audio'
  url?: string
  thumbnail?: string
  preview?: string
  aspectRatio?: 'vertical' | 'square' | 'horizontal'
}

/**
 * Информация о доступе к посту
 */
export interface PostAccess {
  isLocked: boolean
  tier?: 'basic' | 'premium' | 'vip'
  price?: number
  currency?: string
  isPurchased?: boolean
  isSubscribed?: boolean
  userTier?: string
  shouldHideContent: boolean
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

/**
 * Действие с постом
 */
export interface PostAction {
  type: PostActionType
  postId: string
  data?: any
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
export type PostLayoutType = 'list' | 'grid' | 'masonry'

/**
 * Ответ сервера со списком постов
 */
export interface PostsResponse {
  posts: UnifiedPost[]
  total: number
  hasMore: boolean
  nextCursor?: string
} 