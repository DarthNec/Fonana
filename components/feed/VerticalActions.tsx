'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  CheckIcon,
  ShareIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import { UnifiedPost, PostAction } from '@/types/posts'
import { cn } from '@/lib/utils'
import Avatar from '@/components/Avatar'
import { getProfileLink } from '@/lib/utils/links'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { jwtManager } from '@/lib/utils/jwt'
import { toast } from 'react-hot-toast'

// Эмоции из PostActions (правильные)
const EMOTIONS = [
  { id: 1, emoji: '😂', label: 'Смешно', color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  { id: 2, emoji: '🤡', label: 'Клоун', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { id: 3, emoji: '🔥', label: 'Огонь', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { id: 4, emoji: '💩', label: 'Какашка', color: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
  { id: 5, emoji: '❤️', label: 'Сердечко', color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
]

interface VerticalActionsProps {
  post: UnifiedPost
  onAction?: (action: PostAction) => void
  className?: string
  isFullscreen?: boolean // Флаг для fullscreen режима (убирает отступ снизу)
}

/**
 * Вертикальный стек действий справа (как на Hidden.com)
 * С системой эмоций/реакций вместо простых лайков
 */
export function VerticalActions({ post, onAction, className, isFullscreen = true }: VerticalActionsProps) {
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const emotionPickerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const user = useUser()
  const { publicKey } = useWallet()
  const userWallet = publicKey?.toBase58() || null
  
  // Локальное состояние для мгновенного отображения эмоций
  const [localUserEmotionId, setLocalUserEmotionId] = useState<number | null>(
    post.userEmotion?.emotionId || null
  )
  const [localEmotionCounts, setLocalEmotionCounts] = useState<Record<number, number>>(() => {
    if (!post.emotions || post.emotions.length === 0) return {}
    
    const counts: Record<number, number> = {}
    post.emotions.forEach(emotion => {
      counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
    })
    
    return counts
  })
  
  // Синхронизация с post.emotions при изменении (от API)
  useEffect(() => {
    const counts: Record<number, number> = {}
    if (post.emotions && post.emotions.length > 0) {
      post.emotions.forEach(emotion => {
        counts[emotion.emotionId] = (counts[emotion.emotionId] || 0) + 1
      })
    }
    setLocalEmotionCounts(counts)
    setLocalUserEmotionId(post.userEmotion?.emotionId || null)
  }, [post.emotions, post.userEmotion?.emotionId])
  
  // Загрузка статуса подписки
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!user?.id || !post.creator?.id || user.id === post.creator.id) return
      
      try {
        let followingData = [];
        if(localStorage.getItem('user_following') !== null) {
          followingData = JSON.parse(localStorage.getItem('user_following') || '[]')
        } else {
          const followingResponse = await fetch(`/api/user/follow?userId=${user?.id}&type=following`)
          if (followingResponse.ok) {
            followingData = await followingResponse.json()
            localStorage.setItem('user_following', JSON.stringify(followingData.data || null))
          }
        }
        setIsFollowing(followingData.some((f: any) => f.user.id === post.creator.id))
      } catch (error) {
        console.error('[VerticalActions] Error loading follow status:', error)
      }
    }
    
    loadFollowStatus()
  }, [user?.id, post.creator?.id])
  
  // Загрузка статуса bookmark
  /*
  useEffect(() => {
    const loadBookmarkStatus = async () => {
      if (!userWallet || !post.id) return
      
      try {
        const response = await fetch(`/api/bookmarks?userWallet=${encodeURIComponent(userWallet)}`)
        
        if (response.ok) {
          const data = await response.json()
          const isBookmarked = data.bookmarks?.some((b: any) => b.id === post.id)
          setIsBookmarked(isBookmarked || false)
        }
      } catch (error) {
        console.error('Error loading bookmark status:', error)
      }
    }
    
    loadBookmarkStatus()
  }, [userWallet, post.id])
  */
  
  // Подсчет общего количества эмоций
  const totalEmotions = Object.values(localEmotionCounts).reduce((sum, count) => sum + count, 0)
  
  // Обработка подписки/отписки
  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast.error('Подключите кошелек для подписки')
      return
    }
    
    if (user.id === post.creator.id) {
      toast.error('Нельзя подписаться на себя')
      return
    }
    
    setIsFollowLoading(true)
    
    try {
      const token = await jwtManager.getToken()
      if (!token) {
        toast.error('Требуется авторизация')
        setIsFollowLoading(false)
        return
      }
      
      const response = await fetch('/api/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          followingId: post.creator.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newIsFollowing = data.isFollowing
        setIsFollowing(newIsFollowing)
        
        // 🔥 Обновляем localStorage user_following
        if (localStorage.getItem('user_following') !== null) {
          let followingData = JSON.parse(localStorage.getItem('user_following') || '[]')
          
          if (!newIsFollowing) {
            // UNFOLLOW - удаляем из массива
            followingData = followingData.filter((f: any) => f.user.id !== post.creator.id)
          } else {
            // FOLLOW - добавляем в массив
            const newFollowEntry = {
              id: data.followId || `temp_${Date.now()}`,
              userId: post.creator.id,
              createdAt: new Date().toISOString(),
              user: {
                id: post.creator.id,
                nickname: post.creator.nickname || post.creator.username || post.creator.name || 'user',
                fullName: post.creator.name || post.creator.username || 'User',
                avatar: post.creator.avatar || null,
                bio: '',
                followersCount: 0,
                followingCount: 0,
                isVerified: post.creator.isVerified || false
              }
            }
            followingData.push(newFollowEntry)
          }
          
          localStorage.setItem('user_following', JSON.stringify(followingData))
          console.log('[VerticalActions] Updated user_following in localStorage:', followingData.length)
        }
        
        toast.success(newIsFollowing ? 'Подписка оформлена' : 'Подписка отменена')

        // Опционально вызываем onAction для обновления родительского компонента
        /*
        onAction?.({ 
          type: 'subscribe', 
          postId: post.id, 
          data: { creatorId: post.creator.id, isFollowing: newIsFollowing } 
        })
          */
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Ошибка подписки')
      }
    } catch (error) {
      console.error('[VerticalActions] Follow error:', error)
      toast.error('Ошибка подписки')
    } finally {
      setIsFollowLoading(false)
    }
  }
  
  // Обработка добавления/удаления закладки
  const handleBookmarkClick = async () => {
    if (!userWallet) {
      toast.error('Подключите кошелек для сохранения постов')
      return
    }
    
    setIsBookmarkLoading(true)
    
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userWallet: userWallet,
          postId: post.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newBookmarkState = data.action === 'added'
        setIsBookmarked(newBookmarkState)
        toast.success(newBookmarkState ? 'Добавлено в закладки' : 'Удалено из закладок')
        
        // Вызываем onAction для обновления родительского компонента
        onAction?.({ 
          type: 'bookmark', 
          postId: post.id, 
          data: { isBookmarked: newBookmarkState } 
        })
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Ошибка сохранения')
      }
    } catch (error) {
      console.error('[VerticalActions] Bookmark error:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setIsBookmarkLoading(false)
    }
  }
  
  // Закрываем picker при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emotionPickerRef.current && !emotionPickerRef.current.contains(event.target as Node)) {
        setShowEmotionPicker(false)
      }
    }
    
    if (showEmotionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmotionPicker])
  
  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])
  
  // Проверяем, является ли текущий пользователь автором поста
  const isOwner = user?.id === post.creator?.id
  
  const handleEmotionSelect = (emotionId: number) => {
    if (!onAction || isProcessing) return

    setIsProcessing(true)
    
    // Локальное обновление состояния для мгновенного отклика
    const newCounts = { ...localEmotionCounts }
    
    if (localUserEmotionId === emotionId) {
      // Убираем эмоцию (toggle off - выбрана та же самая)
      if (newCounts[emotionId]) {
        newCounts[emotionId] = Math.max(0, newCounts[emotionId] - 1)
        if (newCounts[emotionId] === 0) {
          delete newCounts[emotionId]
        }
      }
      
      setLocalUserEmotionId(null)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'remove-emotion',
        postId: post.id,
        emotionId
      })
      
    } else if (localUserEmotionId !== null && localUserEmotionId !== emotionId) {
      // Заменяем эмоцию (выбрана другая)
      // Убираем старую
      if (newCounts[localUserEmotionId]) {
        newCounts[localUserEmotionId] = Math.max(0, newCounts[localUserEmotionId] - 1)
        if (newCounts[localUserEmotionId] === 0) {
          delete newCounts[localUserEmotionId]
        }
      }
      
      // Добавляем новую
      newCounts[emotionId] = (newCounts[emotionId] || 0) + 1
      
      setLocalUserEmotionId(emotionId)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'add-emotion',
        postId: post.id,
        emotionId
      })
    } else {
      // Добавляем эмоцию (userEmotion нет)
      newCounts[emotionId] = (newCounts[emotionId] || 0) + 1
      
      setLocalUserEmotionId(emotionId)
      setLocalEmotionCounts(newCounts)
      
      onAction({
        type: 'add-emotion',
        postId: post.id,
        emotionId
      })
    }

    // Сбрасываем флаг обработки
    setTimeout(() => {
      setIsProcessing(false)
    }, 300)
    
    // Закрываем picker через небольшую задержку
    setTimeout(() => {
      setShowEmotionPicker(false)
    }, 500)
  }
  
  return (
    <>
      <div className={cn(
        'flex flex-col gap-4',
        className
      )}>
         {/* Avatar с розовым плюсом */}
         <div className="relative group flex flex-col items-center">
           {/* Аватар - клик переходит на профиль */}
           <button
             onClick={() => {
               const profileUrl = getProfileLink(post.creator)
               router.push(profileUrl)
             }}
             className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-[0_0_20px_rgba(255,255,255,0.8)] dark:shadow-[0_0_20px_rgba(255,255,255,0.4)] group-hover:border-purple-400 dark:group-hover:border-purple-500 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all"
           >
             <Avatar
               src={post.creator.avatar}
               alt={post.creator.name || post.creator.nickname || 'User'}
               seed={post.creator.nickname || post.creator.id}
               size={48}
               rounded="full"
             />
           </button>
           
          {/* Кнопка подписки - плюс или галочка (скрыта на мобильном) */}
          {user && user.id !== post.creator.id && (
            <button
              onClick={handleFollowClick}
              disabled={isFollowLoading}
              className={cn(
                'hidden md:flex absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                isFollowing 
                  ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                  : 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
              )}
            >
              {isFollowing ? (
                <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />
              ) : (
                <span className="text-white text-lg font-bold leading-none">+</span>
              )}
            </button>
          )}
         </div>
         
         {/* Emotions/Reactions */}
         <div className="relative">
           <button
             onClick={() => setShowEmotionPicker(!showEmotionPicker)}
             className="flex flex-col items-center gap-1 group"
             disabled={isProcessing}
           >
             {totalEmotions > 0 ? (
               // Показываем эмоции друг на друге (stacked)
               <>
                 <div className="relative w-12 h-12 flex items-center justify-center">
                   {(() => {
                     // Фильтруем эмоции с count > 0
                     const activeEmotions = EMOTIONS.filter(emotion => {
                       const count = localEmotionCounts[emotion.id]
                       return count && count > 0
                     })
                     
                     const emotionCount = activeEmotions.length
                     
                     // Если только 1 тип эмоции - центрируем
                     // Если несколько - делаем offset для симметрии
                     const offsetPerEmotion = 8 // px
                     
                     return activeEmotions.map((emotion, index) => {
                       const count = localEmotionCounts[emotion.id]
                       const isUserEmotion = localUserEmotionId === emotion.id
                       
                       // Вычисляем offset
                       let leftOffset = 0
                       if (emotionCount > 1) {
                         // Центрируем группу: сдвигаем всю группу влево на половину общей ширины
                         const totalWidth = (emotionCount - 1) * offsetPerEmotion
                         leftOffset = index * offsetPerEmotion - totalWidth / 2
                       }
                       
                       return (
                         <div
                           key={emotion.id}
                           className={cn(
                             'absolute w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                             'bg-white dark:bg-slate-800 border-2',
                             isUserEmotion 
                               ? 'border-purple-500 dark:border-purple-400 z-10' 
                               : 'border-gray-200 dark:border-slate-700',
                             'group-hover:scale-110 group-hover:shadow-lg'
                           )}
                           style={{
                             left: emotionCount === 1 ? '50%' : `calc(50% + ${leftOffset}px)`,
                             transform: 'translateX(-50%)',
                           }}
                         >
                           <span className="text-2xl leading-none">{emotion.emoji}</span>
                         </div>
                       )
                     })
                   })()}
                 </div>
                 <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                   {totalEmotions > 999 ? `${(totalEmotions / 1000).toFixed(1)}k` : totalEmotions}
                 </span>
               </>
             ) : (
               // Показываем обычную кнопку лайка
               <>
                 <div className={cn(
                   'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                   'bg-white dark:bg-slate-800 border-2',
                   'border-gray-200 dark:border-slate-700 group-hover:border-pink-400 dark:group-hover:border-pink-500',
                   'group-hover:scale-110 group-hover:shadow-lg'
                 )}>
                   <HeartIcon className="w-7 h-7 text-gray-700 dark:text-slate-300 group-hover:text-pink-500" />
                 </div>
               </>
             )}
           </button>
          
          {/* Emotion Picker Panel - Вертикальный */}
          {showEmotionPicker && (
            <div 
              ref={emotionPickerRef}
              className="absolute right-full mr-4 top-0 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 p-2"
              style={{
                animation: 'slideInFromRight 0.2s ease-out'
              }}
            >
              <div className="flex flex-col gap-1">
                {EMOTIONS.map((emotion) => {
                  const isSelected = localUserEmotionId === emotion.id
                  return (
                    <button
                      key={emotion.id}
                      onClick={() => handleEmotionSelect(emotion.id)}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
                        emotion.color,
                        'hover:scale-110 active:scale-95',
                        isSelected && 'bg-purple-100 dark:bg-purple-900/50 ring-2 ring-purple-500'
                      )}
                      title={emotion.label}
                    >
                      <span className="text-2xl leading-none">{emotion.emoji}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Comments */}
        <button
          onClick={() => onAction?.({ type: 'comment', postId: post.id })}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 group-hover:border-purple-400 dark:group-hover:border-purple-500 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200">
            <ChatBubbleLeftIcon className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </div>
          {post.engagement?.comments > 0 && (
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
              {post.engagement.comments > 999 ? `${(post.engagement.comments / 1000).toFixed(1)}k` : post.engagement.comments}
            </span>
          )}
        </button>
        
        {/* TIP */}
        <button
          onClick={() => onAction?.({ type: 'tip', postId: post.id })}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 group-hover:from-yellow-500 group-hover:to-orange-600 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200 border-2 border-yellow-300 dark:border-yellow-600">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300">TIP</span>
        </button>
        
        {/* Save/Bookmark */}
        <button
          onClick={handleBookmarkClick}
          disabled={isBookmarkLoading}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
            'bg-white dark:bg-slate-800 border-2',
            isBookmarked 
              ? 'border-blue-400 dark:border-blue-500' 
              : 'border-gray-200 dark:border-slate-700 group-hover:border-blue-400 dark:group-hover:border-blue-500',
            'group-hover:scale-110 group-hover:shadow-lg',
            isBookmarkLoading && 'opacity-50 cursor-not-allowed'
          )}>
            {isBookmarked ? (
              <BookmarkSolidIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <BookmarkIcon className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            )}
          </div>
        </button>
        
        {/* Menu с Download кнопкой */}
        <div className="relative" ref={menuRef}>
          {/* Download - слева от Menu на мобильном, НЕ показывается на десктопе */}
          {post.media?.url && 
           !post.access?.isLocked && 
           !post.access?.price && 
           !post.commerce?.isSellable && 
           (post.media.type === 'video' || post.media.type === 'image' || post.media.type === 'ai-video') && (
            <a
              href={`/api/download?url=${encodeURIComponent(post.media.url)}`}
              onClick={(e) => e.stopPropagation()}
              className="md:hidden absolute -left-14 top-0 flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 group-hover:border-green-400 dark:group-hover:border-green-500 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200">
                <ArrowDownTrayIcon className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400" />
              </div>
            </a>
          )}
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
              'bg-white dark:bg-slate-800 border-2',
              showMenu
                ? 'border-purple-400 dark:border-purple-500'
                : 'border-gray-200 dark:border-slate-700 group-hover:border-gray-400 dark:group-hover:border-slate-500',
              'group-hover:scale-110 group-hover:shadow-lg'
            )}>
              <EllipsisHorizontalIcon className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white" />
            </div>
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute bottom-14 right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
              {/* Share - для всех */}
              <button
                onClick={() => {
                  onAction?.({ type: 'share', postId: post.id })
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ShareIcon className="w-5 h-5" />
                <span>Share</span>
              </button>
              
              {/* Delete - только для автора */}
              {isOwner && (
                <button
                  onClick={() => {
                    onAction?.({ type: 'delete', postId: post.id })
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Delete post</span>
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Download button - только на десктопе, ПОД кнопкой с 3 точками */}
        {post.media?.url && 
         !post.access?.isLocked && 
         !post.access?.price && 
         !post.commerce?.isSellable && 
         (post.media.type === 'video' || post.media.type === 'image' || post.media.type === 'ai-video') && (
          <a
            href={`/api/download?url=${encodeURIComponent(post.media.url)}`}
            onClick={(e) => e.stopPropagation()}
            className="hidden md:flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 group-hover:border-green-400 dark:group-hover:border-green-500 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200">
              <ArrowDownTrayIcon className="w-6 h-6 text-gray-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400" />
            </div>
          </a>
        )}
      </div>
    </>
  )
}

