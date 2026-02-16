'use client'

import React, { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'
import { useAppStore } from '@/lib/store/appStore'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'
import { useWalletStore } from '@/lib/store/walletStore'
import { PublicKey } from '@solana/web3.js'

interface LogInMethodPopupProps {
  isOpen: boolean
  onClose: () => void
  onPhantomLogin: () => void
  onLoginSuccess?: () => void
}

// Глобальный тип для window.TelegramLoginWidget
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

export default function LogInMethodPopup({ 
  isOpen, 
  onClose, 
  onPhantomLogin,
  onLoginSuccess 
}: LogInMethodPopupProps) {
  const router = useRouter()
  const telegramContainerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)
  const setUser = useAppStore(state => state.setUser)
  const { loadSubscriptions } = useSubscriptionStore()
  const [isGuestLoading, setIsGuestLoading] = React.useState(false)

  // Обработчик гостевой авторизации
  const handleGuestLogin = async () => {
    console.log('🔓 [GUEST LOGIN] Starting guest authentication...')
    setIsGuestLoading(true)
    
    try {
      // 1. Проверяем наличие deviceId в localStorage
      let deviceId = localStorage.getItem('fonana_device_id')
      
      if (deviceId) {
        console.log('🔓 [GUEST LOGIN] Found existing deviceId in localStorage:', deviceId)
      } else {
        console.log('🔓 [GUEST LOGIN] No deviceId found, will create new user')
      }
      
      // 2. Отправляем запрос на backend для создания/поиска гостевого пользователя
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }) // Отправляем deviceId если есть
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Guest authentication failed')
      }

      console.log('🔓 [GUEST LOGIN] Authentication successful:', {
        user: data.user,
        isNewUser: data.isNewUser,
        deviceId: data.deviceId
      })

      // 3. СОХРАНЯЕМ deviceId в localStorage для последующих входов
      if (data.deviceId) {
        localStorage.setItem('fonana_device_id', data.deviceId)
        console.log('🔓 [GUEST LOGIN] Device ID saved to localStorage:', data.deviceId)
      }

      // 4. СОХРАНЯЕМ FAKE WALLET В LOCALSTORAGE
      const fakeWallet = data.user.wallet
      localStorage.setItem('fonana_user_wallet', fakeWallet)
      localStorage.setItem('fonana_guest_auth', 'true') // Маркер гостевой авторизации
      console.log('🔓 [GUEST LOGIN] Wallet saved to localStorage:', fakeWallet)

      // 5. ПОЛУЧАЕМ JWT TOKEN через jwtManager
      console.log('🔓 [GUEST LOGIN] Getting JWT token via jwtManager...')
      const token = await jwtManager.getToken()
      if (token) {
        console.log('🔓 [GUEST LOGIN] JWT token ready')
        useAppStore.getState().setJwtReady(true)
      } else {
        throw new Error('Failed to get JWT token')
      }

      // 6. ПОЛУЧАЕМ ПОЛНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      console.log('🔓 [GUEST LOGIN] Fetching full user data...')
      const userResponse = await fetch(`/api/auth/token?wallet=${fakeWallet}`)
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data')
      }

      const userData = await userResponse.json()
      
      if (!userData.user) {
        throw new Error('No user data in response')
      }

      console.log('🔓 [GUEST LOGIN] User data fetched:', {
        userId: userData.user.id,
        nickname: userData.user.nickname,
        wallet: userData.user.wallet,
      })

      // 7. СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ В STORE
      setUser(userData.user)
      
      // Помечаем как нового пользователя для onboarding ТОЛЬКО если это реально новый пользователь
      if (data.isNewUser) {
        console.log('🔓 [GUEST LOGIN] New guest user, setting flag for profile setup')
        localStorage.setItem('fonana_is_new_user', 'true')
      } else {
        console.log('🔓 [GUEST LOGIN] Returning guest user, skipping onboarding')
        // Убираем флаг если он был установлен ранее
        localStorage.removeItem('fonana_is_new_user')
      }

      // 8. ЭМУЛИРУЕМ ПОДКЛЮЧЕННЫЙ КОШЕЛЕК для гостевых пользователей
      console.log('🔓 [GUEST LOGIN] Emulating connected wallet...')
      
      useWalletStore.getState().updateState({
        connected: true,
        publicKey: null, // null т.к. это не настоящий Solana адрес
        connecting: false,
        disconnecting: false,
        wallet: null
      })
      
      console.log('🔓 [GUEST LOGIN] Wallet state emulated as connected (publicKey=null)')

      // 9. ЗАГРУЖАЕМ SUBSCRIPTIONS
      loadSubscriptions(userData.user.id)

      // 10. ЗАГРУЖАЕМ LIKES
      if (userData.user.id) {
        const likesResponse = await fetch(`/api/likes/user?userId=${userData.user.id}`)
        if (likesResponse.ok) {
          const likesData = await likesResponse.json()
          console.log('🔓 [GUEST LOGIN] User likes loaded:', likesData?.length || 0)
          localStorage.setItem('user_likes', JSON.stringify(likesData || []))
        }
      }

      // 11. Показываем успешное уведомление
      const welcomeMessage = data.isNewUser 
        ? `Welcome, ${data.user.nickname}! 🎉`
        : `Welcome back, ${data.user.nickname}! 👋`
      
      toast.success(welcomeMessage, {
        duration: 3000,
        position: 'top-center',
      })

      // 12. Закрываем попап и вызываем callback
      onClose()
      if (onLoginSuccess) {
        onLoginSuccess()
      }

      // 13. Перенаправляем на главную страницу
      console.log('🔓 [GUEST LOGIN] Redirecting to feed...')
      router.push('/feed')

    } catch (error) {
      console.error('🔓 [GUEST LOGIN] Error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to log in as guest',
        { duration: 4000, position: 'top-center' }
      )
    } finally {
      setIsGuestLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || scriptLoadedRef.current) return

    // Глобальная функция для callback от Telegram
    window.onTelegramAuth = async (user) => {
      console.log('🔵 [TELEGRAM LOGIN] Received user data:', user)
      
      try {
        // 1. Отправляем данные на backend для создания пользователя
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Authentication failed')
        }

        console.log('🔵 [TELEGRAM LOGIN] User created/found:', data.user)

        // 2. 🔥 СОХРАНЯЕМ FAKE WALLET В LOCALSTORAGE (как при подключении кошелька)
        const fakeWallet = data.user.wallet
        localStorage.setItem('fonana_user_wallet', fakeWallet)
        localStorage.setItem('fonana_telegram_auth', 'true') // Маркер Telegram авторизации
        console.log('🔵 [TELEGRAM LOGIN] Wallet saved to localStorage:', fakeWallet)

        // 3. 🔥 ПОЛУЧАЕМ JWT TOKEN через jwtManager (как при подключении кошелька)
        console.log('🔵 [TELEGRAM LOGIN] Getting JWT token via jwtManager...')
        const token = await jwtManager.getToken()
        if (token) {
          console.log('🔵 [TELEGRAM LOGIN] JWT token ready')
          useAppStore.getState().setJwtReady(true)
        } else {
          throw new Error('Failed to get JWT token')
        }

        // 4. 🔥 ПОЛУЧАЕМ ПОЛНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ (как при подключении кошелька)
        console.log('🔵 [TELEGRAM LOGIN] Fetching full user data...')
        const userResponse = await fetch(`/api/auth/token?wallet=${fakeWallet}`)
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data')
        }

        const userData = await userResponse.json()
        
        if (!userData.user) {
          throw new Error('No user data in response')
        }

        console.log('🔵 [TELEGRAM LOGIN] User data fetched:', {
          userId: userData.user.id,
          nickname: userData.user.nickname,
          wallet: userData.user.wallet,
          isNewUser: userData.isNewUser
        })

        // 5. 🔥 СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ В STORE (как при подключении кошелька)
        setUser(userData.user)
        
        // ✅ НОВОЕ: Обрабатываем isNewUser
        if (userData.isNewUser) {
          console.log('🔵 [TELEGRAM LOGIN] New user detected, setting flag for profile setup')
          localStorage.setItem('fonana_is_new_user', 'true')
        }

        // 6. 🔥 ЭМУЛИРУЕМ ПОДКЛЮЧЕННЫЙ КОШЕЛЕК для Telegram пользователей
        console.log('🔵 [TELEGRAM LOGIN] Emulating connected wallet...')
        
        // Для Telegram пользователей НЕ создаем PublicKey (т.к. адрес TG_... не валидный)
        // Используем null для publicKey, но connected=true
        useWalletStore.getState().updateState({
          connected: true,
          publicKey: null, // null т.к. это не настоящий Solana адрес
          connecting: false,
          disconnecting: false,
          wallet: null
        })
        
        console.log('🔵 [TELEGRAM LOGIN] Wallet state emulated as connected (publicKey=null)')

        // 7. 🔥 ЗАГРУЖАЕМ SUBSCRIPTIONS (как при подключении кошелька)
        loadSubscriptions(userData.user.id)

        // 8. 🔥 ЗАГРУЖАЕМ LIKES (как при подключении кошелька)
        if (userData.user.id) {
          const likesResponse = await fetch(`/api/likes/user?userId=${userData.user.id}`)
          if (likesResponse.ok) {
            const likesData = await likesResponse.json()
            console.log('🔵 [TELEGRAM LOGIN] User likes loaded:', likesData?.length || 0)
            localStorage.setItem('user_likes', JSON.stringify(likesData || []))
          }
        }

        // 9. Показываем успешное уведомление
        toast.success(`Добро пожаловать, ${userData.user.nickname || userData.user.fullName}!`)

        // 10. Закрываем модалку
        onClose()

        // 11. Вызываем callback успешной авторизации
        if (onLoginSuccess) {
          onLoginSuccess()
        }

        // 12. Обновляем страницу
        console.log('🔵 [TELEGRAM LOGIN] Authentication complete, reloading page...')


      } catch (error) {
        console.error('🔵 [TELEGRAM LOGIN] Error:', error)
        toast.error(
          error instanceof Error 
            ? `Ошибка авторизации: ${error.message}` 
            : 'Не удалось войти через Telegram'
        )
      }
    }
    
    // Создаем скрипт Telegram Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', 'fonana_auth_bot') // ← замени на реальный bot username (БЕЗ @)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-radius', '8')
  
    // Добавляем скрипт в контейнер
    if (telegramContainerRef.current) {
      telegramContainerRef.current.appendChild(script)
      scriptLoadedRef.current = true
    }

    return () => {
      // Очищаем при размонтировании
      if (telegramContainerRef.current) {
        telegramContainerRef.current.innerHTML = ''
      }
      scriptLoadedRef.current = false
      delete window.onTelegramAuth
    }
  }, [isOpen, onClose, onLoginSuccess, router, setUser, loadSubscriptions])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Log in to your account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your crypto wallet to continue
            </p>
          </div>

          {/* Login Methods */}
          <div className="space-y-4">
            {/* Anonymous Login (Soft) */}
            <button
              onClick={handleGuestLogin}
              disabled={isGuestLoading}
              className="w-full flex items-center gap-4 p-4 bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGuestLoading ? (
                <>
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
                    <div className="w-5 h-5 border-3 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-base">Creating account...</div>
                    <div className="text-xs text-gray-100">Please wait</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
                    <svg 
                      className="w-6 h-6 text-gray-600 dark:text-gray-800" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                      />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-base">Continue as Guest</div>
                    <div className="text-xs text-gray-100">Browse without connecting wallet</div>
                  </div>
                </>
              )}
            </button>

            {/* Phantom Wallet Login */}
            <button
              onClick={() => {
                onPhantomLogin()
                onClose()
              }}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl group"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
                <svg 
                  className="w-6 h-6" 
                  viewBox="0 0 128 128" 
                  fill="none"
                >
                  <path 
                    d="M104.017 38.5826C97.5574 30.8365 87.9421 26.2859 77.8029 26.2859C75.0558 26.2859 52.8676 26.3546 40.9637 38.2585C29.0599 50.1624 29.1286 72.3505 29.1286 75.0977C29.1286 85.2369 33.6792 94.8522 41.4253 101.312C49.1714 107.771 59.2733 111.714 69.4499 111.714C72.1971 111.714 94.3852 111.646 106.289 99.7418C118.193 87.8379 118.124 65.6498 118.124 62.9026C118.124 52.7633 113.573 43.148 106.289 36.6886C105.826 36.2632 104.48 38.1199 104.017 38.5826ZM54.4189 56.139C56.0789 54.479 58.2616 53.5736 60.5443 53.5736C62.827 53.5736 65.0097 54.479 66.6697 56.139C68.3297 57.799 69.2351 59.9817 69.2351 62.2644C69.2351 64.5471 68.3297 66.7298 66.6697 68.3898C65.0097 70.0498 62.827 70.9552 60.5443 70.9552C58.2616 70.9552 56.0789 70.0498 54.4189 68.3898C52.7589 66.7298 51.8535 64.5471 51.8535 62.2644C51.8535 59.9817 52.7589 57.799 54.4189 56.139ZM85.1871 68.3898C83.5271 70.0498 81.3444 70.9552 79.0617 70.9552C76.779 70.9552 74.5963 70.0498 72.9363 68.3898C71.2763 66.7298 70.3709 64.5471 70.3709 62.2644C70.3709 59.9817 71.2763 57.799 72.9363 56.139C74.5963 54.479 76.779 53.5736 79.0617 53.5736C81.3444 53.5736 83.5271 54.479 85.1871 56.139C86.8471 57.799 87.7525 59.9817 87.7525 62.2644C87.7525 64.5471 86.8471 66.7298 85.1871 68.3898ZM52.9589 87.0626C51.8535 87.0626 50.9481 86.1572 50.9481 85.0518C50.9481 83.9464 51.8535 83.041 52.9589 83.041H86.5844C87.6898 83.041 88.5952 83.9464 88.5952 85.0518C88.5952 86.1572 87.6898 87.0626 86.5844 87.0626H52.9589Z" 
                    fill="url(#phantom-gradient)"
                  />
                  <defs>
                    <linearGradient id="phantom-gradient" x1="29.1286" y1="26.2859" x2="118.124" y2="111.714" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#9945FF"/>
                      <stop offset="1" stopColor="#14F195"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-base">Log in through Phantom</div>
                <div className="text-xs text-purple-100">Connect your crypto wallet</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
