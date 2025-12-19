// services/posts/normalizer.ts
// Сервис для нормализации данных постов в унифицированный формат

import { 
  UnifiedPost, 
  PostCreator, 
  PostContent, 
  PostMedia, 
  PostAccess, 
  PostCommerce,
  PostEngagement,
  AuctionData,
  FlashSaleData
} from '@/types/posts'
import { transformMediaUrl } from '@/lib/utils/mediaUrl'

/**
 * Класс для нормализации данных постов из различных источников
 */
export class PostNormalizer {
  /**
   * Преобразует сырые данные поста в унифицированный формат
   */
  static normalize(rawPost: any): UnifiedPost {
    console.log('PostNormalizer: Normalizing post', rawPost);
    return {
      id: rawPost.id,
      creator: this.normalizeCreator(rawPost.creator || rawPost),
      content: this.normalizeContent(rawPost),
      media: this.normalizeMedia(rawPost),
      access: this.normalizeAccess(rawPost),
      commerce: this.normalizeCommerce(rawPost),
      remixId: rawPost.remixId ?? null,
      engagement: this.normalizeEngagement(rawPost),
      emotions: rawPost.emotions || [],
      userEmotion: rawPost.userEmotion,
      emotionsCount: rawPost.emotions?.length || 0,
      postRemixes: this.normalizeRemixes(rawPost.postRemixes),
      createdAt: rawPost.createdAt,
      updatedAt: rawPost.updatedAt || rawPost.createdAt
    }
  }

  /**
   * Нормализует данные создателя
   */
  private static normalizeCreator(rawCreator: any): PostCreator {
    // Проверяем что у нас есть валидные данные создателя
    if (!rawCreator || (!rawCreator.id && !rawCreator.creatorId)) {
      console.error('PostNormalizer: Invalid creator data', rawCreator)
      // Возвращаем заглушку чтобы не ломалась навигация
      return {
        id: 'unknown',
        name: 'Unknown Creator',
        username: 'unknown',
        nickname: 'unknown',
        avatar: null,
        isVerified: false
      }
    }
    
    return {
      id: rawCreator.id || rawCreator.creatorId || 'unknown',
      name: rawCreator.fullName || rawCreator.name || rawCreator.nickname || 'Unknown',
      username: rawCreator.nickname || rawCreator.username || rawCreator.wallet?.slice(0, 6) + '...' || 'unknown',
      nickname: rawCreator.nickname || 'unknown',
      avatar: rawCreator.avatar,
      isVerified: rawCreator.isVerified || false
    }
  }

  /**
   * Нормализует контент поста
   */
  private static normalizeContent(rawPost: any): PostContent {
    return {
      title: rawPost.title || '',
      text: rawPost.content || '',
      category: rawPost.category,
      tags: this.normalizeTags(rawPost.tags)
    }
  }

  /**
   * Нормализует медиа данные
   */
  private static normalizeMedia(rawPost: any): PostMedia {
    console.log('PostNormalizer: Normalizing media', rawPost);
    
    const postType = rawPost.type || 'text'
    const hasMediaUrl = !!(rawPost.mediaUrl || rawPost.image)
    
    // Для текстовых постов без медиа не используем placeholder
    const mediaUrl = (postType === 'text' && !hasMediaUrl) 
      ? undefined 
      : transformMediaUrl(rawPost.mediaUrl || rawPost.image)
    
    return {
      type: postType,
      url: mediaUrl,
      thumbnail: transformMediaUrl(rawPost.thumbnail),
      preview: transformMediaUrl(rawPost.previewUrl),
      aspectRatio: rawPost.imageAspectRatio,
      requestId: rawPost.requestId,
      error: rawPost.error || null
    }
  }

  /**
   * Нормализует данные доступа к посту
   */
  private static normalizeAccess(rawPost: any): PostAccess {
    // Определяем tier на основе различных полей
    let tier: 'basic' | 'premium' | 'vip' | undefined = undefined
    
    if (rawPost.minSubscriptionTier) {
      tier = rawPost.minSubscriptionTier.toLowerCase() as 'basic' | 'premium' | 'vip'
    } else if (rawPost.requiredTier) {
      tier = rawPost.requiredTier.toLowerCase() as 'basic' | 'premium' | 'vip'
    } else if (rawPost.isPremium) {
      // Legacy поддержка: isPremium означает VIP контент
      tier = 'vip'
    }

    // КРИТИЧЕСКИЙ ФИКС: для продаваемых постов берем цену из правильного источника
    let price = rawPost.price
    
    // Для аукционов берем текущую ставку или стартовую цену
    if (rawPost.isSellable && rawPost.sellType === 'AUCTION') {
      if (rawPost.auctionCurrentBid !== undefined && rawPost.auctionCurrentBid !== null) {
        price = rawPost.auctionCurrentBid
      } else if (rawPost.auctionStartPrice !== undefined && rawPost.auctionStartPrice !== null) {
        price = rawPost.auctionStartPrice
      }
    }

    return {
      isLocked: rawPost.isLocked || false,
      tier,
      price,
      currency: rawPost.currency || 'SOL',
      isPurchased: rawPost.hasPurchased || rawPost.isPurchased || false,
      isSubscribed: rawPost.isSubscribed || false,
      userTier: rawPost.userTier?.toLowerCase(),
      shouldHideContent: rawPost.shouldHideContent || false,
      isCreatorPost: rawPost.isCreatorPost || false
    }
  }

  /**
   * Нормализует коммерческие данные
   */
  private static normalizeCommerce(rawPost: any): PostCommerce | undefined {
    if (!rawPost.isSellable && !rawPost.flashSale && !rawPost.flashSales?.length) {
      return undefined
    }

    return {
      isSellable: rawPost.isSellable || false,
      sellType: rawPost.sellType,
      quantity: rawPost.quantity,
      soldAt: rawPost.soldAt,
      soldTo: rawPost.soldTo ? this.normalizeCreator(rawPost.soldTo) : undefined,
      soldPrice: rawPost.soldPrice,
      auctionData: this.normalizeAuctionData(rawPost),
      flashSale: this.normalizeFlashSale(rawPost.flashSale || rawPost.flashSales?.[0])
    }
  }

  /**
   * Нормализует данные аукциона
   */
  private static normalizeAuctionData(rawPost: any): AuctionData | undefined {
    if (!rawPost.sellType || rawPost.sellType !== 'AUCTION') {
      return undefined
    }

    return {
      status: rawPost.auctionStatus,
      startPrice: rawPost.auctionStartPrice,
      stepPrice: rawPost.auctionStepPrice,
      currentBid: rawPost.auctionCurrentBid,
      depositAmount: rawPost.auctionDepositAmount,
      startAt: rawPost.auctionStartAt,
      endAt: rawPost.auctionEndAt
    }
  }

  /**
   * Нормализует данные Flash Sale
   */
  private static normalizeFlashSale(rawFlashSale: any): FlashSaleData | undefined {
    if (!rawFlashSale) {
      return undefined
    }

    return {
      id: rawFlashSale.id,
      discount: rawFlashSale.discount,
      endAt: rawFlashSale.endAt,
      maxRedemptions: rawFlashSale.maxRedemptions,
      usedCount: rawFlashSale.usedCount || 0,
      remainingRedemptions: rawFlashSale.remainingRedemptions,
      timeLeft: rawFlashSale.timeLeft || Math.floor((new Date(rawFlashSale.endAt).getTime() - Date.now()) / 1000)
    }
  }

  /**
   * Нормализует данные вовлеченности
   */
  private static normalizeEngagement(rawPost: any): PostEngagement {
    console.log(`[PostNormalizer] Normalizing engagement:`, rawPost);
    return {
      likes: rawPost.likes || rawPost._count?.likes || rawPost.likesCount || 0,
      comments: rawPost.comments || rawPost._count?.comments || rawPost.commentsCount || 0,
      views: rawPost.views || rawPost.viewsCount || Math.floor((rawPost.likes || 0) * 4.2), // Legacy формула
      isLiked: rawPost.isLiked || false
    }
  }

  /**
   * Нормализует теги
   */
  private static normalizeTags(tags: any): string[] {
    if (!tags) return []
    
    if (Array.isArray(tags)) {
      return tags.map(tag => {
        if (typeof tag === 'string') return tag
        if (tag.tag?.name) return tag.tag.name
        if (tag.name) return tag.name
        return ''
      }).filter(Boolean)
    }
    
    return []
  }

  /**
   * Нормализует массив ремиксов
   */
  private static normalizeRemixes(rawRemixes: any): UnifiedPost[] {
    if (!rawRemixes || !Array.isArray(rawRemixes)) {
      return []
    }
    
    // Рекурсивно нормализуем каждый ремикс
    return rawRemixes.map(remix => this.normalize(remix))
  }

  /**
   * Нормализует массив постов
   */
  static normalizeMany(rawPosts: any[], likesData: any[], emotionsData: any[]): UnifiedPost[] {
    console.log(`[PostNormalizer] Likes data:`, likesData);
    console.log(`[PostNormalizer] Raw posts:`, rawPosts);
    if(likesData != undefined) {
      if(likesData.length > 0) {
      rawPosts = rawPosts.map(post => {
        const like = likesData.find(like => like.postId === post.id);
        return {
          ...post,
          isLiked: like ? true : false
          }
        })
      }
    }

    if(emotionsData != undefined) {
      if(emotionsData.length > 0) {
        rawPosts = rawPosts.map(post => {
          const emotion = emotionsData.find(emotion => emotion.postId === post.id);
          return {
            ...post,
            userEmotion: emotion
          }
        })
      }
    }
    console.log(`[PostNormalizer] Raw posts after likes:`, rawPosts);
    return rawPosts.map(post => this.normalize(post))
  }
} 