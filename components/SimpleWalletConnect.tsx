'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import { XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export function SimpleWalletConnect() {
  const { connected } = useWallet()
  const [showUXHint, setShowUXHint] = useState(false)
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false)
  
  // Определяем окружение
  useEffect(() => {
    const env = detectWalletEnvironment()
    setIsInWalletBrowser(env.isInWalletBrowser)
    
    // Показываем подсказку только если мы действительно во встроенном браузере кошелька
    if (env.isInWalletBrowser) {
      setShowUXHint(true)
      setTimeout(() => setShowUXHint(false), 15000) // Скрываем через 15 секунд
    }
  }, [])

  const openInMainBrowser = () => {
    const currentUrl = window.location.href
    
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // iOS - пытаемся открыть в Safari
      navigator.clipboard.writeText(currentUrl)
      toast('Ссылка скопирована! Откройте в Safari', { icon: '📋', duration: 5000 })
    } else if (/Android/.test(navigator.userAgent)) {
      // Android - пытаемся открыть в Chrome
      navigator.clipboard.writeText(currentUrl)
      toast('Ссылка скопирована! Откройте в Chrome', { icon: '📋', duration: 5000 })
    } else {
      // Для десктопа просто копируем ссылку
      navigator.clipboard.writeText(currentUrl)
      toast.success('Ссылка скопирована!')
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        
        {/* Кнопка открытия в браузере, если мы во встроенном браузере */}
        {isInWalletBrowser && (
          <button
            onClick={openInMainBrowser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200"
            title="Скопировать ссылку для обычного браузера"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Копировать ссылку</span>
          </button>
        )}
      </div>
      
      {/* UX подсказка для встроенных браузеров */}
      {showUXHint && isInWalletBrowser && (
        <div className="absolute top-full mt-2 right-0 w-72 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-lg z-50">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            💡 Для лучшего опыта рекомендуем открыть сайт в обычном браузере
          </p>
          <button
            onClick={openInMainBrowser}
            className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Скопировать ссылку
          </button>
          <button
            onClick={() => setShowUXHint(false)}
            className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800"
          >
            <XCircleIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
} 