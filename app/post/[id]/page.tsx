'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { useUserContext } from '@/lib/contexts/UserContext'
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  PlayIcon,
  CheckBadgeIcon,
  EyeIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { toast } from 'react-hot-toast'

interface Post {
  id: string
  creator: {
    id: string
    name: string
    username: string
    avatar: string | null
    isVerified?: boolean
  }
  title: string
  content: string
  image?: string
  type: string
  isLocked: boolean
  likes: number
  comments: number
  views: number
  createdAt: string
  tags: string[]
  isPremium: boolean
}

interface Comment {
  id: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
    isVerified?: boolean
  }
  content: string
  createdAt: string
  likes: number
  replies?: Comment[]
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUserContext()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Загружаем пост
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/posts/${params.id}${user ? `?userId=${user.id}` : ''}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Пост не найден')
          } else {
            setError('Ошибка загрузки поста')
          }
          return
        }
        
        const data = await response.json()
        setPost(data.post)
        setLikeCount(data.post.engagement?.likes || data.post.likes || 0)
        setIsLiked(data.post.engagement?.isLiked || false)
      } catch (error) {
        console.error('Error fetching post:', error)
        setError('Ошибка подключения к серверу')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchPost()
    }
  }, [params.id, user])

  // Загружаем комментарии
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoadingComments(true)
        const response = await fetch(`/api/posts/${params.id}/comments`)
        if (response.ok) {
          const data = await response.json()
          setComments(data.comments || [])
        }
      } catch (error) {
        console.error('Error fetching comments:', error)
      } finally {
        setIsLoadingComments(false)
      }
    }

    if (params.id) {
      fetchComments()
    }
  }, [params.id])

  // Проверяем статус лайка
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user || !params.id) return
      
      try {
        const response = await fetch(`/api/posts/${params.id}/like?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setIsLiked(data.isLiked)
          setLikeCount(data.likesCount)
        }
      } catch (error) {
        console.error('Error checking like status:', error)
      }
    }

    checkLikeStatus()
  }, [user, params.id])

  // Прокрутка к комментариям при загрузке страницы
  useEffect(() => {
    if (!isLoading && window.location.hash === '#comments') {
      setTimeout(() => {
        const commentsSection = document.getElementById('comments')
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [isLoading])

  const handleLike = async () => {
    if (!user) {
      alert('Пожалуйста, подключите кошелек')
      return
    }

    try {
      const response = await fetch(`/api/posts/${params.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.isLiked)
        setLikeCount(data.likesCount)
        
        if (data.action === 'liked') {
          toast.success('Пост лайкнут!')
        } else {
          toast.success('Лайк убран')
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Ошибка при лайке')
    }
  }

  const handleAddComment = async () => {
    if (!user) {
      alert('Пожалуйста, подключите кошелек')
      return
    }

    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    setCommentError(null)

    try {
      const response = await fetch(`/api/posts/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          content: newComment,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments([data.comment, ...comments])
        setNewComment('')
      } else {
        setCommentError('Ошибка при добавлении комментария')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      setCommentError('Ошибка подключения к серверу')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{error}</h2>
          <button
            onClick={() => router.push('/feed')}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Вернуться к ленте
          </button>
        </div>
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-2/3 right-1/4 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 pt-32 pb-8 lg:pt-40 lg:pb-12 max-w-4xl">
          <Link 
            href="/feed"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Назад к ленте
          </Link>

          <article className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl overflow-hidden mb-8">
            <div className="flex items-center gap-4 p-6 pb-4">
              <Link href={`/creator/${post.creator.id}`} className="flex items-center gap-4 group/creator">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Avatar
                    src={post.creator.avatar}
                    alt={post.creator.name}
                    seed={post.creator.username}
                    size={64}
                    rounded="2xl"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white group-hover/creator:text-purple-300 transition-colors">
                      {post.creator.name}
                    </h3>
                    {post.creator.isVerified && (
                      <CheckBadgeIcon className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <p className="text-slate-400">@{post.creator.username}</p>
                </div>
              </Link>
              
              <div className="ml-auto text-slate-400">
                {formatDate(post.createdAt)}
              </div>
            </div>

            <div className="px-6">
              <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                {post.title}
              </h1>

              <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                {post.content}
              </p>

              {post.image && (
                <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/10 to-pink-900/10">
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={800}
                    height={400}
                    className="w-full h-96 object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-slate-700/50 text-slate-300 text-sm rounded-xl hover:bg-slate-600/50 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
              <div className="flex items-center gap-8">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors group/like"
                >
                  {isLiked ? (
                    <HeartSolidIcon className="w-6 h-6 text-red-500" />
                  ) : (
                    <HeartIcon className="w-6 h-6 group-hover/like:scale-110 transition-transform" />
                  )}
                  <span className="font-semibold text-lg">{likeCount}</span>
                </button>

                <a
                  href="#comments"
                  className="flex items-center gap-3 text-slate-400 hover:text-blue-400 transition-colors group/comment"
                >
                  <ChatBubbleLeftIcon className="w-6 h-6 group-hover/comment:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">{comments.length}</span>
                </a>

                <div className="flex items-center gap-3 text-slate-400">
                  <EyeIcon className="w-6 h-6" />
                  <span className="font-semibold text-lg">{post.views || 0}</span>
                </div>
              </div>

              <button className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors group/share">
                <ShareIcon className="w-6 h-6 group-hover/share:scale-110 transition-transform" />
                <span className="font-medium">Поделиться</span>
              </button>
            </div>
          </article>

          <div id="comments" className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Комментарии ({comments.length})
              </span>
            </h2>

            <div className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-3 sm:p-6 mb-6 sm:mb-8">
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0">
                  {user ? (
                    <Avatar
                      src={user.avatar}
                      alt={user.fullName || user.nickname || 'User'}
                      seed={user.wallet}
                      size={48}
                      rounded="2xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-base sm:text-lg">?</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "Напишите комментарий..." : "Подключите кошелек, чтобы комментировать"}
                    disabled={!user || isSubmittingComment}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-600/50 border border-slate-500/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[40px] sm:min-h-[48px]"
                    rows={2}
                  />
                  {commentError && (
                    <p className="text-red-400 text-xs sm:text-sm mt-2">{commentError}</p>
                  )}
                  <div className="flex justify-end mt-3 sm:mt-4">
                    <button
                      onClick={handleAddComment}
                      disabled={!user || !newComment.trim() || isSubmittingComment}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center gap-2 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {isSubmittingComment ? (
                        <>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Отправка...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          Отправить
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isLoadingComments ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-700/20 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6 hover:bg-slate-700/30 transition-all duration-300">
                    <div className="flex gap-4">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex-shrink-0">
                        <Avatar
                          src={comment.user.avatar}
                          alt={comment.user.name}
                          seed={comment.user.username}
                          size={48}
                          rounded="2xl"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{comment.user.name}</h4>
                          {comment.user.isVerified && (
                            <CheckBadgeIcon className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-slate-400 text-sm">@{comment.user.username}</span>
                          <span className="text-slate-500 text-sm">•</span>
                          <span className="text-slate-500 text-sm">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed mb-3">{comment.content}</p>
                        <button className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors group">
                          <HeartIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium">{comment.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comments.length === 0 && !isLoadingComments && (
              <div className="text-center py-8">
                <p className="text-slate-400">Пока нет комментариев. Будьте первым!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
