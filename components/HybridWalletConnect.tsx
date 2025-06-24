'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState, useCallback } from 'react'
import { generateSignMessage, detectWalletEnvironment } from '@/lib/auth/solana'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { WalletIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import bs58 from 'bs58'
import { useRouter, useSearchParams } from 'next/navigation'

export function HybridWalletConnect() {
  const { connected, connect, disconnect, wallet, publicKey, signMessage } = useWallet()
  const { user, refreshUser } = useUser()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showUXHint, setShowUXHint] = useState(false)
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Проверяем JWT авторизацию при загрузке
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Проверяем токен из URL (для синхронизации между браузерами)
  useEffect(() => {
    const tokenFromUrl = searchParams.get('auth_token')
    const returnPath = searchParams.get('return_path') || '/'
    
    if (tokenFromUrl) {
      // Сохраняем токен и обновляем статус
      handleTokenFromUrl(tokenFromUrl, returnPath)
    }
  }, [searchParams])

  // Определяем окружение
  useEffect(() => {
    const env = detectWalletEnvironment()
    
    // Запоминаем что мы во встроенном браузере
    setIsInWalletBrowser(env.isInWalletBrowser)
    
    // Показываем подсказку если в встроенном браузере
    if (env.isInWalletBrowser && !env.isMobile) {
      setShowUXHint(true)
      setTimeout(() => setShowUXHint(false), 10000) // Скрываем через 10 секунд
    }
  }, [])

  const handleTokenFromUrl = async (token: string, returnPath: string) => {
    try {
      // Отправляем токен на сервер для установки cookie
      const response = await fetch('/api/auth/wallet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        setIsAuthenticated(true)
        toast.success('Авторизация успешна!')
        
        // Очищаем URL от токена
        router.replace(returnPath)
        
        // Обновляем данные пользователя
        await refreshUser()
      }
    } catch (error) {
      console.error('Token sync error:', error)
    }
  }

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/wallet')
      const data = await response.json()
      
      if (data.authenticated) {
        setIsAuthenticated(true)
        
        // Если есть JWT но нет подключенного кошелька - просто обновляем состояние
        if (!connected && publicKey?.toString() !== data.user.wallet) {
          // Пользователь авторизован, но кошелек не подключен
          // Это нормально - подключим когда понадобится
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  // Авторизация через подпись после подключения кошелька
  const authenticateWithSignature = async () => {
    if (!publicKey || !signMessage) {
      toast.error('Кошелек не подключен')
      return
    }

    setIsAuthenticating(true)
    const loadingToast = toast.loading('Запрашиваем подпись...')

    try {
      // Генерируем сообщение для подписи
      const message = generateSignMessage()
      const messageBytes = new TextEncoder().encode(message)
      
      // Запрашиваем подпись
      const signature = await signMessage(messageBytes)
      const signatureBase58 = bs58.encode(signature)
      
      // Отправляем на сервер для проверки
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature: signatureBase58,
          publicKey: publicKey.toString()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsAuthenticated(true)
        toast.success('Авторизация успешна!', { id: loadingToast })
        
        // Сохраняем токен в localStorage как fallback
        if (data.token) {
          localStorage.setItem('fonana-jwt', data.token)
          
          // Для мобильных устройств - пытаемся вернуться в основной браузер
          const env = detectWalletEnvironment()
          if (env.isMobile && env.isInWalletBrowser) {
            // Генерируем URL для возврата с токеном
            const returnUrl = new URL(window.location.origin)
            returnUrl.searchParams.set('auth_token', data.token)
            returnUrl.searchParams.set('return_path', window.location.pathname)
            
            // Показываем специальное уведомление с кнопкой
            const toastId = toast(
              (t) => (
                <div className="flex flex-col gap-2">
                  <p className="font-medium">✅ Авторизация успешна!</p>
                  <p className="text-sm opacity-90">Откройте Fonana в обычном браузере для продолжения</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        // Копируем ссылку с токеном
                        navigator.clipboard.writeText(returnUrl.toString())
                        toast.success('Ссылка скопирована!', { duration: 3000 })
                      }}
                      className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Копировать ссылку
                    </button>
                    <button
                      onClick={() => {
                        toast.dismiss(t.id)
                        // Пытаемся открыть в браузере
                        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                          window.location.href = `safari-${returnUrl.toString()}`
                        } else if (/Android/.test(navigator.userAgent)) {
                          window.location.href = `intent://${returnUrl.toString().replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
                        } else {
                          window.open(returnUrl.toString(), '_blank')
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Открыть
                    </button>
                  </div>
                </div>
              ),
              {
                duration: 30000, // 30 секунд
                position: 'bottom-center',
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  maxWidth: '90vw',
                  padding: '16px'
                }
              }
            )
          }
        }
        
        // Обновляем данные пользователя
        await refreshUser()
      } else {
        toast.error(data.error || 'Ошибка авторизации', { id: loadingToast })
      }
    } catch (error: any) {
      console.error('Authentication error:', error)
      toast.error('Не удалось подписать сообщение', { id: loadingToast })
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Обработчик подключения кошелька
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating) {
      // Автоматически запрашиваем подпись после подключения
      authenticateWithSignature()
    }
  }, [connected, publicKey])

  // Проверяем JWT из localStorage при загрузке (fallback для мобильных)
  useEffect(() => {
    const storedToken = localStorage.getItem('fonana-jwt')
    if (storedToken && !isAuthenticated) {
      // Пытаемся синхронизировать токен с сервером
      handleTokenFromUrl(storedToken, window.location.pathname)
    }
  }, [])

  // Выход из системы
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })
      
      localStorage.removeItem('fonana-jwt')
      setIsAuthenticated(false)
      disconnect()
      toast.success('Вы вышли из системы')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Кастомная кнопка для авторизованных пользователей
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl">
          <CheckCircleIcon className="w-5 h-5" />
          <span className="font-medium">Авторизован</span>
        </div>
        
        {connected ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-medium transition-all duration-200"
          >
            Выйти
          </button>
        ) : (
          <button
            onClick={() => connect()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl font-medium transition-all duration-200"
          >
            <WalletIcon className="w-5 h-5" />
            Подключить кошелек
          </button>
        )}
      </div>
    )
  }

  const openInMainBrowser = () => {
    const currentUrl = window.location.href
    
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // iOS - пытаемся открыть в Safari
      window.location.href = `safari-${currentUrl}`
      toast('Нажмите "Открыть в Safari" в меню браузера', { icon: '🌐', duration: 8000 })
    } else if (/Android/.test(navigator.userAgent)) {
      // Android - пытаемся открыть в Chrome
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
      toast('Нажмите "Открыть в Chrome" в меню браузера', { icon: '🌐', duration: 8000 })
    } else {
      // Для десктопа просто копируем ссылку
      navigator.clipboard.writeText(currentUrl)
      toast.success('Ссылка скопирована! Откройте в обычном браузере')
    }
  }

  // Стандартная кнопка для неавторизованных
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        
        {/* Кнопка открытия в браузере, если мы во встроенном браузере */}
        {isInWalletBrowser && (
          <button
            onClick={openInMainBrowser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200"
            title="Открыть в обычном браузере"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">Открыть в браузере</span>
          </button>
        )}
      </div>
      
      {/* UX подсказка */}
      {showUXHint && (
        <div className="absolute top-full mt-2 right-0 w-72 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            💡 Для лучшего опыта рекомендуем открыть сайт в обычном браузере
          </p>
          <button
            onClick={openInMainBrowser}
            className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Открыть в браузере
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