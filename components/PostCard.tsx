'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
import OptimizedImage from './OptimizedImage'
import ImageViewer from './ImageViewer'
import { toast } from 'react-hot-toast'
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  LockClosedIcon,
  PlayIcon,
  CheckBadgeIcon,
  EyeIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useUser } from '@/lib/hooks/useUser'
import { getProfileLink } from '@/lib/utils/links'
import EditPostModal from './EditPostModal'

interface Creator {
  id: string
  name: string
  username: string
  nickname?: string
  avatar: string | null
  isVerified: boolean
}

interface Comment {
  id: string
  user: {
    name: string
    username: string
    avatar: string | null
    isVerified: boolean
  }
  content: string
  createdAt: string
  likes: number
  isLiked?: boolean
  replies?: Comment[]
}

interface PostCardProps {
  id: string | number
  creator: Creator
  title: string
  content: string
  category?: string
  image?: string
  mediaUrl?: string  // Добавляем оригинальный mediaUrl
  thumbnail?: string  // Добавляем оригинальный thumbnail
  preview?: string   // Добавляем превью изображение
  type: 'text' | 'image' | 'video' | 'audio'
  isLocked: boolean
  price?: number
  currency?: string
  likes: number
  comments: number
  createdAt: string
  tags: string[]
  isPremium?: boolean
  isSubscribed?: boolean
  shouldHideContent?: boolean
  showCreator?: boolean
  requiredTier?: string | null
  userTier?: string | null
  // Новые поля для продаваемых постов
  isSellable?: boolean
  sellType?: 'FIXED_PRICE' | 'AUCTION'
  quantity?: number  // Количество товара
  auctionStatus?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SOLD' | 'CANCELLED' | 'EXPIRED'
  auctionStartPrice?: number
  auctionCurrentBid?: number
  auctionEndAt?: string
  soldAt?: string
  soldTo?: { id: string; nickname?: string; wallet: string }
  soldPrice?: number
  onSubscribeClick?: (creatorData: any, preferredTier?: 'basic' | 'premium' | 'vip') => void
  onPurchaseClick?: (postData: any) => void
  onSellableClick?: (postData: any) => void  // Новый callback для продаваемых постов
  onEditClick?: (postData: any) => void  // Добавляем callback для редактирования
}

export default function PostCard({
  id,
  creator,
  title,
  content,
  category,
  image,
  mediaUrl,
  thumbnail,
  preview,
  type,
  isLocked,
  price,
  currency,
  likes,
  comments,
  createdAt,
  tags,
  isPremium = false,
  isSubscribed = false,
  shouldHideContent = false,
  showCreator = true,
  requiredTier,
  userTier,
  isSellable,
  sellType,
  quantity,
  auctionStatus,
  auctionStartPrice,
  auctionCurrentBid,
  auctionEndAt,
  soldAt,
  soldTo,
  soldPrice,
  onSubscribeClick,
  onPurchaseClick,
  onSellableClick,
  onEditClick
}: PostCardProps) {
  const { user } = useUser()
  const [likesCount, setLikesCount] = useState(likes)
  const [isLiked, setIsLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentsData, setCommentsData] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isLoadingLike, setIsLoadingLike] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Загружаем статус лайка при монтировании
  useEffect(() => {
    if (user?.id && id) {
      checkLikeStatus()
    }
  }, [user?.id, id])

  // Загружаем комментарии при открытии
  useEffect(() => {
    if (showComments && id) {
      loadComments()
    }
  }, [showComments, id])

  // Закрываем меню действий при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActions])

  const checkLikeStatus = async () => {
    try {
      const response = await fetch(`/api/posts/${id}/like?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.isLiked)
        setLikesCount(data.likesCount)
      }
    } catch (error) {
      console.error('Error checking like status:', error)
    }
  }

  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const response = await fetch(`/api/posts/${id}/comments`)
      if (response.ok) {
        const data = await response.json()
        setCommentsData(data.comments)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleLike = async () => {
    if (!user?.id) {
      toast.error('Login to like')
      return
    }

    try {
      const response = await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        const data = await response.json()
        setLikesCount(data.likesCount)
        setIsLiked(data.isLiked)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Error updating like')
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!user?.id) {
      toast.error('Login to like')
      return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        const data = await response.json()
        setCommentsData(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: data.likesCount, isLiked: data.isLiked }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
      toast.error('Error updating like')
    }
  }

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!user?.id) {
      toast.error('Login to like')
      return
    }

    try {
      const response = await fetch(`/api/comments/${replyId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        const data = await response.json()
        setCommentsData(prev => prev.map(comment => 
          comment.id === commentId 
            ? {
                ...comment,
                replies: comment.replies?.map(reply =>
                  reply.id === replyId
                    ? {
                        ...reply,
                        likes: data.likesCount,
                        isLiked: data.isLiked
                      }
                    : reply
                ) || []
              }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error toggling reply like:', error)
      toast.error('Error updating like')
    }
  }

  const handleAddComment = async () => {
    if (!user?.id) {
      toast.error('Login to comment')
      return
    }

    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: newComment
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCommentsData([...commentsData, data.comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Error adding comment')
    }
  }

  const handleAddReply = async (commentId: string) => {
    if (!user?.id) {
      toast.error('Login to reply')
      return
    }

    if (!replyContent.trim()) return

    try {
      const response = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: replyContent,
          parentId: commentId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCommentsData(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies: [...(comment.replies || []), data.comment] }
            : comment
        ))
        setReplyContent('')
        setReplyTo(null)
      }
    } catch (error) {
      console.error('Error adding reply:', error)
      toast.error('Error adding reply')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = async () => {
    if (!user?.wallet) return

    const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/posts/${id}?userWallet=${user.wallet}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete post')
      }

      toast.success('Post deleted successfully')
      // Refresh the page or remove the post from the list
      window.location.reload()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setShowActions(false)
    
    // Если есть callback, используем его
    if (onEditClick) {
      onEditClick({
        id,
        title,
        content,
        category,
        image,
        mediaUrl: mediaUrl || image,
        thumbnail: thumbnail || image,
        tags,
        isLocked,
        isPremium,
        price,
        currency,
        requiredTier,
        creatorId: creator.id
      })
    } else {
      // Иначе используем локальную модалку (для обратной совместимости)
      setShowEditModal(true)
    }
  }

  // Check if current user is the post creator
  // Добавляем логирование для отладки
  const isCreator = user?.id && creator?.id && user.id === creator.id
  
  // Debug logging
  if (process.env.NODE_ENV === 'development' && showEditModal) {
    console.log(`[PostCard] Post ${id} - user.id: ${user?.id}, creator.id: ${creator?.id}, isCreator: ${isCreator}, showEditModal: ${showEditModal}`)
  }

  // Use shouldHideContent flag from API instead of complex local logic
  const canViewContent = !shouldHideContent
  
  const needsPayment = isLocked && price && price > 0 && !isSellable // Обычный платный контент (не товар)
  const needsSellablePayment = false // Sellable посты не требуют оплаты для просмотра, оплата за реальный товар
  const isActiveAuction = isSellable && sellType === 'AUCTION' && auctionStatus === 'ACTIVE'
  const isTierContent = isLocked && requiredTier && !price
  // Обратная совместимость для старых постов с isPremium
  const isLegacyVipContent = isLocked && isPremium && !price && !requiredTier
  const isSubscriberContent = isLocked && !isPremium && !price && !requiredTier

  // Определяем детали тиров с классической цветовой схемой
  const tierDetails = {
    'free': { name: 'Free', color: 'gray', icon: '🔓', gradient: 'from-gray-500/20 to-slate-500/20', border: 'border-gray-500/30', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500 dark:bg-gray-400' },
    'basic': { name: 'Basic', color: 'blue', icon: '⭐', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500 dark:bg-blue-400' },
    'premium': { name: 'Premium', color: 'purple', icon: '🔮', gradient: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500 dark:bg-purple-400' },
    'vip': { name: 'VIP', color: 'gold', icon: '👑', gradient: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500 dark:bg-yellow-400' }
  }

  const getTierInfo = () => {
    if (!requiredTier) return null
    
    const required = tierDetails[requiredTier.toLowerCase() as keyof typeof tierDetails]
    if (!required) return null
    
    const current = userTier ? tierDetails[userTier.toLowerCase() as keyof typeof tierDetails] : null
    
    return {
      required,
      current,
      needsUpgrade: !!current // Есть подписка, но нужен апгрейд
    }
  }

  const tierInfo = getTierInfo()

  return (
    <article className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 transition-all duration-500 mb-8 ${
      needsPayment 
        ? 'hover:border-yellow-500/50 dark:hover:border-yellow-500/30'
        : isTierContent && tierInfo && tierInfo.required
        ? tierInfo.required.color === 'gold'
          ? 'hover:border-yellow-500/50 dark:hover:border-yellow-500/30'
          : tierInfo.required.color === 'purple'
          ? 'hover:border-purple-500/50 dark:hover:border-purple-500/30'
          : tierInfo.required.color === 'blue'
          ? 'hover:border-blue-500/50 dark:hover:border-blue-500/30'
          : tierInfo.required.color === 'green'
          ? 'hover:border-green-500/50 dark:hover:border-green-500/30'
          : 'hover:border-gray-500/50 dark:hover:border-gray-500/30'
        : isLegacyVipContent
        ? 'hover:border-yellow-500/50 dark:hover:border-yellow-500/30'
        : isSubscriberContent
        ? 'hover:border-green-500/50 dark:hover:border-green-500/30'
        : !isLocked
        ? 'hover:border-gray-500/50 dark:hover:border-gray-500/30'
        : 'hover:border-purple-500/50 dark:hover:border-purple-500/30'
    }`}>
      {/* Hover glow effect */}
      <div className={`absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 ${
        needsPayment 
          ? 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
          : isTierContent && tierInfo && tierInfo.required
          ? tierInfo.required.color === 'gold'
            ? 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
            : tierInfo.required.color === 'purple'
            ? 'bg-gradient-to-r from-purple-600/10 to-pink-600/10'
            : tierInfo.required.color === 'blue'
            ? 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10'
            : tierInfo.required.color === 'green'
            ? 'bg-gradient-to-r from-green-600/10 to-emerald-600/10'
            : 'bg-gradient-to-r from-gray-600/10 to-slate-600/10'
          : isLegacyVipContent
          ? 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
          : isSubscriberContent
          ? 'bg-gradient-to-r from-green-600/10 to-emerald-600/10'
          : !isLocked
          ? 'bg-gradient-to-r from-gray-600/10 to-slate-600/10'
          : 'bg-gradient-to-r from-purple-600/10 to-pink-600/10'
      }`}></div>
      
      <div className="relative z-10">
        {/* Creator Info Header */}
        {showCreator && (
          <div className="flex items-center gap-3 p-6 pb-4">
            <Link href={getProfileLink({ id: creator.id, nickname: creator.nickname || creator.username })} className="flex items-center gap-3 group/creator">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Avatar
                  src={creator.avatar}
                  alt={creator.name}
                  seed={creator.username}
                  size={48}
                  rounded="2xl"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover/creator:text-purple-600 dark:group-hover/creator:text-purple-300 transition-colors">
                    {creator.name}
                  </h3>
                  {creator.isVerified && (
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  )}
                </div>
                <p className="text-gray-600 dark:text-slate-400 text-sm">@{creator.username}</p>
              </div>
            </Link>
            
            <div className="ml-auto flex items-center gap-2">
              <span className="text-gray-600 dark:text-slate-400 text-sm">
                {formatDate(createdAt)}
              </span>
              
              {/* Creator Actions */}
              {isCreator && (
                <div ref={actionsRef} className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                  
                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit Post
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {isDeleting ? 'Deleting...' : 'Delete Post'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`px-6 ${!showCreator ? 'pt-6' : ''}`}>
          {/* Category Badge */}
          {category && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-500/30 mb-3">
              {category}
            </div>
          )}
          
          {/* Sellable Post Badge */}
          {isSellable && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full mb-3 ml-2 ${
              auctionStatus === 'SOLD' || soldAt
                ? 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 dark:text-gray-300 border border-gray-500/30'
                : sellType === 'AUCTION' && auctionStatus === 'ACTIVE'
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30 animate-pulse'
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
            }`}>
              {auctionStatus === 'SOLD' || soldAt ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                  ✅ Sold {soldTo && `@${soldTo.nickname || soldTo.wallet.slice(0, 6) + '...'}`}
                  {soldPrice && ` for ${soldPrice} SOL`}
                </>
              ) : sellType === 'AUCTION' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-yellow-400 animate-pulse"></span>
                  🕒 Auction
                  {auctionStatus === 'ACTIVE' && auctionEndAt && (
                    <span className="text-xs">
                      (until {new Date(auctionEndAt).toLocaleString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      })})
                    </span>
                  )}
                  {auctionCurrentBid && auctionCurrentBid > 0 && (
                    <span className="text-xs font-bold ml-1">
                      Current bid: {auctionCurrentBid} SOL
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-yellow-400"></span>
                  🛒 Buy for {price} {currency}
                </>
              )}
            </div>
          )}
          
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            {title}
          </h2>

          {/* Content and Media */}
          {canViewContent ? (
            <>
              {/* Content Preview */}
              <div className="mb-4">
                <p className={`text-gray-700 dark:text-slate-300 leading-relaxed ${!isExpanded && content.length > 200 ? 'line-clamp-3' : ''}`}>
                  {content}
                </p>
                {content.length > 200 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm mt-2 transition-colors"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>

              {/* Media Content */}
              {(mediaUrl || thumbnail || image) && (
                <div className="relative -mx-6 mb-4 overflow-hidden bg-gradient-to-br from-purple-900/10 to-pink-900/10">
                  <OptimizedImage
                    src={mediaUrl || image || null}
                    thumbnail={thumbnail || null}
                    preview={preview || null}
                    alt={title}
                    className="w-full aspect-[4/3] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    type={type === 'video' ? 'video' : 'image'}
                    onClick={() => type !== 'video' && setShowImageViewer(true)}
                  />
                </div>
              )}
            </>
          ) : (
            /* Locked Content */
            <div className="relative -mx-6 mb-4 bg-gradient-to-br from-gray-100 dark:from-slate-800/50 to-gray-50 dark:to-slate-900/70 backdrop-blur-sm border-y border-gray-200 dark:border-slate-700/50">
              <div className="py-16 px-6 text-center">
                <LockClosedIcon className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <div className="text-gray-900 dark:text-slate-300 font-semibold text-lg mb-2">
                  {needsPayment ? 'Paid Content' : 
                   isTierContent && tierInfo ? `${tierInfo.required.icon} ${tierInfo.required.name} Content` :
                   isLegacyVipContent ? 'VIP Content' : 
                   isSubscriberContent ? 'Subscribers Only' : 
                   'Locked Content'}
                </div>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                  {needsPayment 
                    ? 'Purchase access to this content' 
                    : isTierContent && tierInfo
                    ? tierInfo.current 
                      ? `You have ${tierInfo.current.icon} ${tierInfo.current.name} subscription. Upgrade to ${tierInfo.required.icon} ${tierInfo.required.name} to access this content.`
                      : `This content requires ${tierInfo.required.icon} ${tierInfo.required.name} subscription`
                    : isLegacyVipContent 
                    ? 'Available only to VIP subscribers'
                    : isSubscriberContent
                    ? 'Available only to subscribers'
                    : 'This content requires special access'
                  }
                </p>
                {needsPayment && (
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-2xl mb-4">
                    {price} {currency}
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (needsPayment) {
                      onPurchaseClick?.({
                        id: id,
                        title: title,
                        price: price || 0,
                        currency: currency || 'SOL',
                        creator: {
                          id: creator.id,
                          name: creator.name,
                          username: creator.username,
                          avatar: creator.avatar,
                          isVerified: creator.isVerified
                        }
                      })
                    } else {
                      const preferredTier = requiredTier?.toLowerCase() || (isLegacyVipContent ? 'vip' : 'basic')
                      onSubscribeClick?.({
                        id: creator.id,
                        name: creator.name,
                        username: creator.username,
                        avatar: creator.avatar || '',
                        isVerified: creator.isVerified
                      }, preferredTier as 'basic' | 'premium' | 'vip')
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all transform hover:scale-105"
                >
                  {needsPayment 
                    ? `Buy for ${price} ${currency}`
                    : isTierContent && tierInfo
                    ? userTier 
                      ? `Upgrade to ${tierInfo.required.name}`
                      : `Subscribe to ${tierInfo.required.name}`
                    : isLegacyVipContent 
                    ? 'Sign Up for VIP'
                    : 'Subscribe'
                  }
                </button>
              </div>
            </div>
          )}

          {/* Content Type Badge */}
          {(isLocked || isPremium) && !isSellable && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full mb-4 ${
              needsPayment 
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                : isTierContent && tierInfo && tierInfo.required
                ? `bg-gradient-to-r ${tierInfo.required.gradient} ${tierInfo.required.text} border ${tierInfo.required.border}`
                : isLegacyVipContent
                ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                : isSubscriberContent
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 border border-green-500/30'
                : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300 border border-gray-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                needsPayment 
                  ? 'bg-yellow-500 dark:bg-yellow-400'
                  : isTierContent && tierInfo && tierInfo.required
                  ? tierInfo.required.dot
                  : isLegacyVipContent
                  ? 'bg-yellow-500 dark:bg-yellow-400'
                  : isSubscriberContent
                  ? 'bg-green-500 dark:bg-green-400'
                  : 'bg-gray-500 dark:bg-gray-400'
              }`}></span>
              {needsPayment 
                ? 'Paid Content'
                : isTierContent && tierInfo
                ? `${tierInfo.required.icon} ${tierInfo.required.name} Content`
                : isLegacyVipContent
                ? '👑 VIP Content'
                : isSubscriberContent
                ? '⭐ Subscribers Only'
                : 'Premium Content'
              }
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-400 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-slate-600/50 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Sellable Post Purchase Button */}
          {isSellable && !soldAt && (
            <div className="mt-6 mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {sellType === 'AUCTION' ? '🕒 Auction' : '🛒 For Sale'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {sellType === 'AUCTION' 
                      ? 'Place a bid to participate in the auction'
                      : 'Purchase this item directly from the seller'
                    }
                  </p>
                  {sellType === 'FIXED_PRICE' && quantity && quantity > 1 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      📦 {quantity} items available
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {sellType === 'AUCTION' ? (
                    <>
                      {auctionCurrentBid && auctionCurrentBid > 0 ? (
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          Current: {auctionCurrentBid} SOL
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          Start: {auctionStartPrice} SOL
                        </div>
                      )}
                      {auctionEndAt && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Ends {new Date(auctionEndAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {price} {currency}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onSellableClick?.({
                  id: id,
                  title: title,
                  price: price || 0,
                  currency: currency || 'SOL',
                  sellType: sellType,
                  quantity: quantity || 1,
                  auctionStartPrice: auctionStartPrice,
                  auctionCurrentBid: auctionCurrentBid,
                  auctionEndAt: auctionEndAt,
                  creator: {
                    id: creator.id,
                    name: creator.name,
                    username: creator.username,
                    avatar: creator.avatar,
                    isVerified: creator.isVerified
                  }
                })}
                className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
              >
                {sellType === 'AUCTION' ? 'Place Bid' : `Buy for ${price} ${currency}`}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200 dark:border-slate-700/50">
          <div className="flex items-center gap-6">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group/like"
            >
              {isLiked ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 group-hover/like:scale-110 transition-transform" />
              )}
              <span className="font-medium">{likesCount}</span>
            </button>

            {/* Comments */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors group/comment"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 group-hover/comment:scale-110 transition-transform" />
              <span className="font-medium">{comments}</span>
              {showComments ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>

            {/* Views */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
              <EyeIcon className="w-5 h-5" />
              <span className="font-medium">{Math.floor(likes * 4.2)}</span>
            </div>
          </div>

          {/* Share */}
          <button className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group/share">
            <ShareIcon className="w-5 h-5 group-hover/share:scale-110 transition-transform" />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/20 backdrop-blur-sm">
            {/* Add Comment */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700/30">
              <div className="flex gap-3">
                <Avatar
                  src={user?.avatar}
                  alt={user?.nickname || 'Me'}
                  seed={user?.nickname || 'user'}
                  size={40}
                  rounded="xl"
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-slate-600 dark:disabled:to-slate-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-sm hover:scale-105 disabled:hover:scale-100"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="max-h-96 overflow-y-auto">
              {commentsData.map((comment) => (
                <div key={comment.id} className="p-4 border-b border-gray-200 dark:border-slate-700/20 last:border-b-0">
                  <div className="flex gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex-shrink-0">
                      <Avatar
                        src={comment.user.avatar}
                        alt={comment.user.name}
                        seed={comment.user.username}
                        size={40}
                        rounded="xl"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{comment.user.name}</h4>
                        {comment.user.isVerified && (
                          <CheckBadgeIcon className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        )}
                        <span className="text-gray-600 dark:text-slate-400 text-xs">@{comment.user.username}</span>
                        <span className="text-gray-400 dark:text-slate-500 text-xs">•</span>
                        <span className="text-gray-400 dark:text-slate-500 text-xs">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleCommentLike(comment.id)}
                          className="flex items-center gap-1 text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group text-xs"
                        >
                          {comment.isLiked ? (
                            <HeartSolidIcon className="w-3 h-3 text-red-500" />
                          ) : (
                            <HeartIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                          )}
                          <span>{comment.likes}</span>
                        </button>
                        <button 
                          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                          className="text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-xs"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Reply Form */}
                      {replyTo === comment.id && (
                        <div className="mt-3 flex gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">Me</span>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a reply..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none text-xs"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => setReplyTo(null)}
                                className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white text-xs px-3 py-1 rounded transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAddReply(comment.id)}
                                disabled={!replyContent.trim()}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-slate-600 dark:disabled:to-slate-600 text-white font-medium px-3 py-1 rounded transition-all duration-300 text-xs"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2 pl-4 border-l-2 border-gray-200 dark:border-slate-700/50">
                              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex-shrink-0">
                                <Avatar
                                  src={reply.user.avatar}
                                  alt={reply.user.name}
                                  seed={reply.user.username}
                                  size={32}
                                  rounded="xl"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-gray-900 dark:text-white text-xs">{reply.user.name}</h5>
                                  {reply.user.isVerified && (
                                    <CheckBadgeIcon className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                  )}
                                  <span className="text-gray-600 dark:text-slate-400 text-xs">@{reply.user.username}</span>
                                  <span className="text-gray-400 dark:text-slate-500 text-xs">•</span>
                                  <span className="text-gray-400 dark:text-slate-500 text-xs">{formatDate(reply.createdAt)}</span>
                                </div>
                                <p className="text-gray-700 dark:text-slate-300 text-xs leading-relaxed mb-1">{reply.content}</p>
                                <button 
                                  onClick={() => handleReplyLike(comment.id, reply.id)}
                                  className="flex items-center gap-1 text-gray-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group text-xs"
                                >
                                  {reply.isLiked ? (
                                    <HeartSolidIcon className="w-3 h-3 text-red-500" />
                                  ) : (
                                    <HeartIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                  )}
                                  <span>{reply.likes}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Post Modal - только если нет внешнего callback */}
      {showEditModal && !onEditClick && (
        <EditPostModal
          key={`edit-modal-${id}`} // Добавляем ключ для стабильности компонента
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          post={{
            id,
            title,
            content,
            category,
            image,
            mediaUrl: mediaUrl || image,  // Используем оригинальный mediaUrl если есть
            thumbnail: thumbnail || image,  // Используем оригинальный thumbnail если есть
            tags,
            isLocked,
            isPremium,
            price,
            currency,
            requiredTier,
            creatorId: creator.id  // Добавляем creatorId для проверки
          }}
          onPostUpdated={async () => {
            console.log('[PostCard] onPostUpdated called')
            // Сначала закрываем модалку
            setShowEditModal(false)
            
            // Затем вызываем обновление с большей задержкой
            // чтобы модалка успела закрыться
            setTimeout(() => {
              console.log('[PostCard] Dispatching postsUpdated event')
              if (window.dispatchEvent) {
                window.dispatchEvent(new Event('postsUpdated'))
              }
            }, 500) // Увеличиваем задержку для надёжности
          }}
        />
      )}

      {/* Image Viewer for full size */}
      <ImageViewer
        src={mediaUrl || image || ''}
        alt={title}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
      />
    </article>
  )
} 