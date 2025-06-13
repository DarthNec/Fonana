'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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

// Mock data
const mockPost = {
  id: 11,
  creator: {
    id: 1,
    name: 'Anna Crypto',
    username: 'annacrypto',
    avatar: '/avatars/anna.jpg',
    isVerified: true
  },
  title: 'Мой новый NFT проект готов к запуску!',
  content: 'Привет всем! После месяцев работы я наконец готова представить свой новый NFT проект. Это коллекция из 10,000 уникальных цифровых артов, каждый со своей историей и особенностями. Проект сочетает в себе элементы киберпанка и футуризма.',
  image: '/avatars/post1.jpg',
  type: 'image' as const,
  isLocked: false,
  likes: 124,
  comments: 23,
  views: 892,
  createdAt: '2024-01-15T10:30:00Z',
  tags: ['NFT', 'Crypto', 'Digital Art'],
  isPremium: false
}

const mockComments = [
  {
    id: 1,
    user: {
      name: 'Alex Blockchain',
      username: 'alexblockchain',
      avatar: '/avatars/alex.jpg',
      isVerified: false
    },
    content: 'Выглядит потрясающе! Когда будет минт?',
    createdAt: '2024-01-15T11:00:00Z',
    likes: 5
  },
  {
    id: 2,
    user: {
      name: 'Crypto Marina',
      username: 'cryptomarina',
      avatar: '/avatars/marina.jpg',
      isVerified: true
    },
    content: 'Анна, твои работы всегда на высшем уровне! Обязательно буду участвовать в минте 🚀',
    createdAt: '2024-01-15T11:15:00Z',
    likes: 12
  }
]

export default function PostPage() {
  const params = useParams()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(mockPost.likes)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState(mockComments)

  useEffect(() => {
    if (window.location.hash === '#comments') {
      setTimeout(() => {
        const commentsSection = document.getElementById('comments')
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        user: {
          name: 'You',
          username: 'you',
          avatar: '/avatars/default.jpg',
          isVerified: false
        },
        content: newComment,
        createdAt: new Date().toISOString(),
        likes: 0
      }
      setComments([...comments, comment])
      setNewComment('')
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
              <Link href={`/creator/${mockPost.creator.id}`} className="flex items-center gap-4 group/creator">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Image
                    src={mockPost.creator.avatar || '/avatars/default.jpg'}
                    alt={mockPost.creator.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white group-hover/creator:text-purple-300 transition-colors">
                      {mockPost.creator.name}
                    </h3>
                    {mockPost.creator.isVerified && (
                      <CheckBadgeIcon className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <p className="text-slate-400">@{mockPost.creator.username}</p>
                </div>
              </Link>
              
              <div className="ml-auto text-slate-400">
                {formatDate(mockPost.createdAt)}
              </div>
            </div>

            <div className="px-6">
              <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
                {mockPost.title}
              </h1>

              <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                {mockPost.content}
              </p>

              {mockPost.image && (
                <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/10 to-pink-900/10">
                  <Image
                    src={mockPost.image || '/avatars/default.jpg'}
                    alt={mockPost.title}
                    width={800}
                    height={400}
                    className="w-full h-96 object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                {mockPost.tags.map((tag) => (
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
                  <span className="font-semibold text-lg">{mockPost.views}</span>
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

            <div className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-6 mb-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">Я</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Напишите комментарий..."
                    className="w-full px-4 py-3 bg-slate-600/50 border border-slate-500/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 hover:scale-105 disabled:hover:scale-100"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-700/20 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-6 hover:bg-slate-700/30 transition-all duration-300">
                  <div className="flex gap-4">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex-shrink-0">
                      <Image
                        src={comment.user.avatar || '/avatars/default.jpg'}
                        alt={comment.user.name}
                        width={48}
                        height={48}
                        className="object-cover"
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

            {comments.length > 0 && (
              <div className="text-center mt-8">
                <button className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105">
                  Загрузить еще комментарии
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
