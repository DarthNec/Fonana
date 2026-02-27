'use client'

import React, { useState, useRef, useEffect } from 'react'
import { UnifiedPost } from '@/types/posts'
import { cn } from '@/lib/utils'
import { Toast } from '@/components/ui/Toast'

// Иконки социальных сетей
const FacebookIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const TelegramIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)

export interface SharePopupProps {
  post: UnifiedPost
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface SocialNetwork {
  id: string
  name: string
  icon: React.ComponentType
  color: string
  bgColor: string
  hoverColor: string
}

const socialNetworks: SocialNetwork[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    color: 'text-white',
    bgColor: 'bg-[#1877F2]',
    hoverColor: 'hover:bg-[#166FE5]'
  },
  {
    id: 'twitter',
    name: 'Twitter (X)',
    icon: TwitterIcon,
    color: 'text-white',
    bgColor: 'bg-[#000000]',
    hoverColor: 'hover:bg-[#333333]'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    color: 'text-white',
    bgColor: 'bg-gradient-to-r from-[#E4405F] to-[#C13584]',
    hoverColor: 'hover:from-[#D63384] hover:to-[#A02D6A]'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: TelegramIcon,
    color: 'text-white',
    bgColor: 'bg-[#0088CC]',
    hoverColor: 'hover:bg-[#0077B5]'
  }
]

/**
 * Попап для выбора социальной сети для шаринга поста
 */
export function SharePopup({ post, isOpen, onClose, className }: SharePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isSharing, setIsSharing] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Закрытие попапа при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const generateShareUrl = (network: string): string => {
    const postUrl = `${window.location.origin}/post/${post.id}`
    
    // Безопасное извлечение текста из контента
    let postTitle = 'Check out this post on Fonana'
    
    if (post.content) {
      // Используем поле text из PostContent
      if (post.content.text && typeof post.content.text === 'string') {
        postTitle = post.content.text.substring(0, 100)
      } else if (post.content.title && typeof post.content.title === 'string') {
        postTitle = post.content.title.substring(0, 100)
      }
    }
    
    const encodedUrl = encodeURIComponent(postUrl)
    const encodedTitle = encodeURIComponent(postTitle)
    
    switch (network) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
      case 'instagram':
        // Instagram не поддерживает прямые ссылки для шаринга, показываем URL для копирования
        return postUrl
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
      default:
        return postUrl
    }
  }

  const handleShare = async (network: SocialNetwork) => {
    setIsSharing(network.id)
    
    try {
      const shareUrl = generateShareUrl(network.id)
      
      if (network.id === 'instagram') {
        // Для Instagram показываем URL для копирования
        await navigator.clipboard.writeText(shareUrl)
        setToastMessage('Link copied to clipboard! Paste it in Instagram')
        setShowToast(true)
      } else {
        // Открываем окно шаринга
        window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
      }
      
      // Небольшая задержка для UX
      setTimeout(() => {
        setIsSharing(null)
        onClose()
      }, 1000)
      
    } catch (error) {
      console.error('Error sharing:', error)
      setToastMessage('Error sharing')
      setShowToast(true)
      setIsSharing(null)
    }
  }

  const handleCopyLink = async () => {
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`
      await navigator.clipboard.writeText(postUrl)
      setToastMessage('Link copied to clipboard!')
      setShowToast(true)
      
      // Закрываем попап через небольшую задержку
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error copying link:', error)
      setToastMessage('Error copying link')
      setShowToast(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={popupRef}
        className={cn(
          'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-slate-700',
          'p-6 w-full max-w-sm mx-4',
          'animate-fade-in',
          className
        )}
      >
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share post
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Select social network
          </p>
        </div>

        {/* Сетка социальных сетей */}
        <div className="grid grid-cols-2 gap-3">
          {socialNetworks.map((network) => {
            const IconComponent = network.icon
            const isLoading = isSharing === network.id
            
            return (
              <button
                key={network.id}
                onClick={() => handleShare(network)}
                disabled={isLoading}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl',
                  'transition-all duration-200 transform',
                  'hover:scale-105 active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  network.bgColor,
                  network.hoverColor,
                  network.color
                )}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconComponent />
                )}
                <span className="text-xs font-medium mt-2">
                  {isLoading ? 'Sending...' : network.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={handleCopyLink}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-purple-500 to-pink-500',
              'hover:from-purple-600 hover:to-pink-600',
              'text-white font-medium',
              'transition-all duration-200 transform',
              'hover:scale-105 active:scale-95',
              'flex items-center justify-center gap-2'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy link
          </button>
          
          <button
            onClick={onClose}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl',
              'text-gray-600 dark:text-slate-400',
              'hover:bg-gray-100 dark:hover:bg-slate-700',
              'transition-colors font-medium'
            )}
          >
            Cancel
          </button>
        </div>
      </div>
      
      {/* Toast уведомление */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        type={toastMessage.includes('error') ? 'error' : 'success'}
      />
    </div>
  )
}
