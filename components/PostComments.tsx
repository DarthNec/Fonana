'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { HeartIcon, ChatBubbleLeftIcon, CheckBadgeIcon, UserIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { Comment, getCommentsByPostId, addComment, mockUsers } from '@/lib/mockData'
import { useUser } from '@/lib/hooks/useUser'

interface PostCommentsProps {
  postId: number
  isSubscribed: boolean
}

interface CommentItemProps {
  comment: Comment
  level?: number
}

function CommentItem({ comment, level = 0 }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(comment.likes)
  const [showReplies, setShowReplies] = useState(false)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'только что'
    if (diffInHours < 24) return `${diffInHours}ч назад`
    return `${Math.floor(diffInHours / 24)}д назад`
  }

  return (
    <div className={`${level > 0 ? 'ml-12 mt-3' : 'mb-4'}`}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.isAnonymous ? (
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">?</span>
            </div>
          ) : (
            <Image
              src={comment.userAvatar}
              alt={comment.username}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.isAnonymous ? 'Анонимный пользователь' : comment.username}
              </h4>
              {!comment.isAnonymous && comment.isVerified && (
                <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
              )}
              {comment.isAnonymous && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                  Анонимно
                </span>
              )}
              <span className="text-xs text-gray-500">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {comment.content}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-2 ml-1">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors"
            >
              {isLiked ? (
                <HeartSolidIcon className="w-4 h-4 text-red-500" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              <span className="text-xs">{likesCount}</span>
            </button>
            
            <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">
              Ответить
            </button>
            
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                {showReplies ? 'Скрыть' : `Показать ${comment.replies.length} ответ(а)`}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {showReplies && comment.replies && (
        <div className="mt-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostComments({ postId, isSubscribed }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const { user } = useUser()

  // Mock current user data - в реальном приложении это будет из контекста пользователя
  const currentUser = user ? {
    id: parseInt(user.id) || 1,
    username: user.nickname || 'user',
    avatar: user.avatar || '',
    isVerified: false
  } : mockUsers[0]

  useEffect(() => {
    setComments(getCommentsByPostId(postId))
  }, [postId])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() || !isSubscribed) return
    
    try {
      // Simulated API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const comment = addComment(postId, newComment.trim(), currentUser.id, isAnonymous)
      setComments(prev => [...prev, comment])
      setNewComment('')
      setIsAnonymous(false)
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <span className="font-medium">
            Комментарии ({comments.length})
          </span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-4">
          {/* Add Comment Form */}
          {isSubscribed ? (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  {!currentUser.avatar && (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Комментировать анонимно
                  </span>
                </label>
                
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Отправить
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Подпишитесь, чтобы оставлять комментарии
              </p>
              <button className="text-blue-500 hover:text-blue-600 font-medium">
                Подписаться
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  Пока нет комментариев. Будьте первым!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 