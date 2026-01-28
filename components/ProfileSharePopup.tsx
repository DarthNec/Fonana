'use client'

import React, { useState, useRef, useEffect } from 'react'
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

export interface ProfileSharePopupProps {
  creator: {
    id: string | number
    name?: string
    nickname?: string
    fullName?: string
    avatar?: string
  }
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
 * Попап для выбора социальной сети для шаринга профиля
 */
export function ProfileSharePopup({ creator, isOpen, onClose, className }: ProfileSharePopupProps) {
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
    const profileUrl = `${window.location.origin}/creator/${creator.id}`
    const creatorName = creator.name || creator.fullName || creator.nickname || 'Creator'
    const creatorHandle = creator.nickname || creator.name || 'creator'
    const profileTitle = `Check out ${creatorName} (@${creatorHandle}) on Fonana`
    
    const encodedUrl = encodeURIComponent(profileUrl)
    const encodedTitle = encodeURIComponent(profileTitle)
    
    switch (network) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
      case 'instagram':
        // Instagram не поддерживает прямые ссылки для шаринга, показываем URL для копирования
        return profileUrl
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
      default:
        return profileUrl
    }
  }

  const handleShare = async (network: SocialNetwork) => {
    setIsSharing(network.id)
    
    try {
      const shareUrl = generateShareUrl(network.id)
      
      if (network.id === 'instagram') {
        // Для Instagram показываем URL для копирования
        await navigator.clipboard.writeText(shareUrl)
        setToastMessage('Ссылка скопирована! Вставьте её в Instagram')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else {
        // Открываем в новом окне
        window.open(shareUrl, '_blank', 'width=600,height=400')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      setToastMessage('Ошибка при шаринге')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsSharing(null)
    }
  }

  const handleCopyLink = async () => {
    try {
      const profileUrl = `${window.location.origin}/creator/${creator.id}`
      console.log('[ProfileSharePopup] Copying link:', profileUrl)
      
      await navigator.clipboard.writeText(profileUrl)
      
      console.log('[ProfileSharePopup] Link copied successfully')
      setToastMessage('Ссылка скопирована!')
      setShowToast(true)
      
      // Закрываем попап через 1 секунду после успешного копирования
      setTimeout(() => {
        setShowToast(false)
        onClose()
      }, 1000)
    } catch (error) {
      console.error('[ProfileSharePopup] Error copying link:', error)
      setToastMessage('Ошибка при копировании')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div 
          ref={popupRef}
          className={cn(
            'bg-white dark:bg-slate-900 rounded-3xl shadow-2xl',
            'border border-gray-200 dark:border-slate-700/50',
            'p-6 w-full max-w-sm mx-4',
            'animate-fade-in',
            className
          )}
        >
          {/* Заголовок */}
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Поделиться профилем
            </h3>
          </div>

          {/* Сетка социальных сетей */}
          <div className="grid grid-cols-2 gap-3">
            {socialNetworks.map((network) => {
              const IconComponent = network.icon
              const isSharingThis = isSharing === network.id
              
              return (
                <button
                  key={network.id}
                  onClick={() => handleShare(network)}
                  disabled={isSharingThis}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl',
                    'transition-all duration-200 transform hover:scale-105',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
                    network.bgColor,
                    network.hoverColor,
                    network.color
                  )}
                >
                  {isSharingThis ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <IconComponent />
                  )}
                  <span className="text-sm font-medium">{network.name}</span>
                </button>
              )
            })}
          </div>

          {/* Кнопка копирования ссылки */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Скопировать ссылку
            </button>
          </div>
        </div>
      </div>

      {/* Toast уведомления */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          isVisible={showToast}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}
