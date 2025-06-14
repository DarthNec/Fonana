'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from './Avatar'
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
  UserIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useUser } from '@/lib/hooks/useUser'

interface Creator {
  id: number
  name: string
  username: string
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
  onSubscribeClick?: (creatorData: any, preferredTier?: 'basic' | 'premium' | 'vip') => void
  onPurchaseClick?: (postData: any) => void
}

export default function PostCard({
  id,
  creator,
  title,
  content,
  category,
  image,
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
  onSubscribeClick,
  onPurchaseClick
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

  // Use shouldHideContent flag from API instead of complex local logic
  const canViewContent = !shouldHideContent
  
  const needsPayment = isLocked && price && price > 0
  const isVipContent = isLocked && isPremium && !price
  const isSubscriberContent = isLocked && !isPremium && !price

  return (
    <article className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-800/40 dark:to-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 transition-all duration-500 mb-8 ${
      needsPayment 
        ? 'hover:border-yellow-500/50 dark:hover:border-yellow-500/30'
        : isVipContent
        ? 'hover:border-purple-500/50 dark:hover:border-purple-500/30'
        : isSubscriberContent
        ? 'hover:border-blue-500/50 dark:hover:border-blue-500/30'
        : 'hover:border-green-500/50 dark:hover:border-green-500/30'
    }`}>
      {/* Hover glow effect */}
      <div className={`absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 ${
        needsPayment 
          ? 'bg-gradient-to-r from-yellow-600/10 to-orange-600/10'
          : isVipContent
          ? 'bg-gradient-to-r from-purple-600/10 to-pink-600/10'
          : isSubscriberContent
          ? 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10'
          : 'bg-gradient-to-r from-green-600/10 to-emerald-600/10'
      }`}></div>
      
      <div className="relative z-10">
        {/* Creator Info Header */}
        {showCreator && (
          <div className="flex items-center gap-3 p-6 pb-4">
            <Link href={`/creator/${creator.id}`} className="flex items-center gap-3 group/creator">
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
            
            <div className="ml-auto text-gray-600 dark:text-slate-400 text-sm">
              {formatDate(createdAt)}
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
          
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            {title}
          </h2>

          {/* Content and Media */}
          {canViewContent ? (
            <>
              {/* Content Preview */}
              <div className="mb-4">
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {content}
                </p>
              </div>

              {/* Media Content */}
              {image && (
                <div className="relative -mx-6 mb-4 overflow-hidden bg-gradient-to-br from-purple-900/10 to-pink-900/10">
                  <img
                    src={image}
                    alt={title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  {type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        <PlayIcon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Locked Content */
            <div className="relative -mx-6 mb-4 bg-gradient-to-br from-gray-100 dark:from-slate-800/50 to-gray-50 dark:to-slate-900/70 backdrop-blur-sm border-y border-gray-200 dark:border-slate-700/50">
              <div className="py-16 px-6 text-center">
                <LockClosedIcon className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <div className="text-gray-900 dark:text-slate-300 font-semibold text-lg mb-2">
                  {needsPayment ? 'Paid Content' : isVipContent ? 'VIP Content' : isSubscriberContent ? 'Subscribers Only' : 'Locked Content'}
                </div>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                  {needsPayment 
                    ? 'Purchase access to this content' 
                    : isVipContent 
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
                      const preferredTier = isVipContent ? 'vip' : 'basic'
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
                    : isVipContent 
                    ? 'Sign Up for VIP'
                    : 'Subscribe'
                  }
                </button>
              </div>
            </div>
          )}

          {/* Content Type Badge */}
          {(isLocked || isPremium) && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full mb-4 ${
              needsPayment 
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                : isVipContent
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                : isSubscriberContent
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300 border border-gray-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                needsPayment 
                  ? 'bg-yellow-500 dark:bg-yellow-400'
                  : isVipContent
                  ? 'bg-purple-500 dark:bg-purple-400'
                  : isSubscriberContent
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-gray-500 dark:bg-gray-400'
              }`}></span>
              {needsPayment 
                ? 'Paid Content'
                : isVipContent
                ? 'VIP Content'
                : isSubscriberContent
                ? 'Subscribers Only'
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
    </article>
  )
} 