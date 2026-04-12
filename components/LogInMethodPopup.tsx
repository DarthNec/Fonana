'use client'

import React, { useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
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
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  
  // Состояния для Email/Password формы
  const [viewMode, setViewMode] = React.useState<'login' | 'signup' | 'forgot-password' | 'verify-code'>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isEmailLoading, setIsEmailLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [verificationCode, setVerificationCode] = React.useState('')
  const [canCloseModal, setCanCloseModal] = React.useState(true)

  // Обработчик Google OAuth авторизации
  const handleGoogleLogin = async () => {
    console.log('🔴 [GOOGLE LOGIN] Starting Google OAuth...')
    setIsGoogleLoading(true)
    
    try {
      // Запускаем Google OAuth flow через NextAuth
      await signIn('google', {
        callbackUrl: '/auth/google/callback', // Наш custom callback для обработки
        redirect: true
      })
    } catch (error) {
      console.error('🔴 [GOOGLE LOGIN] Error:', error)
      toast.error('Failed to log in with Google', {
        duration: 4000,
        position: 'top-center'
      })
      setIsGoogleLoading(false)
    }
  }

  // Обработчик входа по Email/Password
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsEmailLoading(true)
    
    try {
      // Отправляем запрос на логин
      const response = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      console.log('✅ [EMAIL LOGIN] User logged in:', data.user)

      // Сохраняем wallet и маркер авторизации
      localStorage.setItem('fonana_user_wallet', data.user.wallet)
      localStorage.setItem('fonana_email_auth', 'true')
      
      // Получаем JWT token
      const token = await jwtManager.getToken()
      if (token) {
        useAppStore.getState().setJwtReady(true)
      }

      // Сохраняем пользователя в store
      setUser(data.user)

      // Эмулируем подключенный кошелек
      useWalletStore.getState().updateState({
        connected: true,
        publicKey: null,
        connecting: false,
        disconnecting: false,
        wallet: null
      })

      // Загружаем subscriptions и likes
      loadSubscriptions(data.user.id)
      
      if (data.user.id) {
        const likesResponse = await fetch(`/api/likes/user?userId=${data.user.id}`)
        if (likesResponse.ok) {
          const likesData = await likesResponse.json()
          localStorage.setItem('user_likes', JSON.stringify(likesData || []))
        }
      }

      toast.success(`Welcome back, ${data.user.nickname}!`)
      
      onClose()
      
      if (onLoginSuccess) {
        onLoginSuccess()
      }
      
      router.push('/feed')
      
    } catch (error) {
      console.error('[EMAIL LOGIN] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Обработчик регистрации
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsEmailLoading(true)
    
    try {
      // Отправляем код на почту
      const response = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      // Переключаемся на форму ввода кода
      toast.success('Verification code sent to your email! Check your inbox.', {
        duration: 5000,
        icon: '📧'
      })
      
      setViewMode('verify-code')
      setCanCloseModal(false) // Блокируем закрытие попапа
      setVerificationCode('') // Очищаем код
      
    } catch (error) {
      console.error('[SIGNUP] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Обработчик подтверждения кода
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    setIsEmailLoading(true)
    
    try {
      // Подтверждаем код и создаём пользователя
      const response = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      console.log('✅ [EMAIL SIGNUP] User created:', data.user)

      // Сохраняем wallet и маркер авторизации
      localStorage.setItem('fonana_user_wallet', data.user.wallet)
      localStorage.setItem('fonana_email_auth', 'true')
      
      // Получаем JWT token
      const token = await jwtManager.getToken()
      if (token) {
        useAppStore.getState().setJwtReady(true)
      }

      // Сохраняем пользователя в store
      setUser(data.user)
      
      if (data.isNewUser) {
        localStorage.setItem('fonana_is_new_user', 'true')
      }

      // Эмулируем подключенный кошелек
      useWalletStore.getState().updateState({
        connected: true,
        publicKey: null,
        connecting: false,
        disconnecting: false,
        wallet: null
      })

      // Загружаем subscriptions и likes
      loadSubscriptions(data.user.id)
      
      if (data.user.id) {
        const likesResponse = await fetch(`/api/likes/user?userId=${data.user.id}`)
        if (likesResponse.ok) {
          const likesData = await likesResponse.json()
          localStorage.setItem('user_likes', JSON.stringify(likesData || []))
        }
      }

      toast.success(`Welcome, ${data.user.nickname}! 🎉`)
      
      setCanCloseModal(true) // Разрешаем закрытие
      onClose()
      
      if (onLoginSuccess) {
        onLoginSuccess()
      }
      
      router.push('/feed')
      
    } catch (error) {
      console.error('[VERIFY CODE] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to verify code')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Обработчик восстановления пароля
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    setIsEmailLoading(true)
    
    try {
      // TODO: Implement password reset API
      toast.success('Password reset link sent to your email!', {
        duration: 4000,
        icon: '✉️'
      })
      setViewMode('login')
      setEmail('')
    } catch (error) {
      console.error('[FORGOT PASSWORD] Error:', error)
      toast.error('Failed to send reset link')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Сброс формы при смене режима
  const switchMode = (mode: 'login' | 'signup' | 'forgot-password' | 'verify-code') => {
    // Если пытаемся переключиться из verify-code, проверяем canCloseModal
    if (viewMode === 'verify-code' && !canCloseModal) {
      toast.error('Please verify your email first')
      return
    }
    
    setViewMode(mode)
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setVerificationCode('')
    setCanCloseModal(true)
  }

  // Обработчик закрытия модалки
  const handleClose = () => {
    if (!canCloseModal) {
      toast.error('Please verify your email before closing', {
        icon: '⚠️'
      })
      return
    }
    onClose()
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
      {/* Fullscreen Loading Overlay для Google Login */}
      {isGoogleLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center animate-fadeIn">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-purple-200/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-blue-600 border-r-red-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connecting to Google...</h3>
            <p className="text-sm text-gray-300">You will be redirected to Google</p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        {/* Modal */}
        <div 
          className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {viewMode === 'login' && 'Log in to your account'}
              {viewMode === 'signup' && 'Create an account'}
              {viewMode === 'forgot-password' && 'Reset your password'}
              {viewMode === 'verify-code' && 'Verify your email'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {viewMode === 'login' && 'Choose your preferred login method'}
              {viewMode === 'signup' && 'Sign up to get started'}
              {viewMode === 'forgot-password' && "We'll send you a reset link"}
              {viewMode === 'verify-code' && `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {/* Email/Password Form */}
          {viewMode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {/* Forgot Password - справа под полем */}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Log In Button - полная ширина */}
              <button
                type="submit"
                disabled={isEmailLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isEmailLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  'Log In'
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {viewMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 characters)"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isEmailLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-gray-600 dark:text-slate-400"
                >
                  Already have an account?{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300">
                    Log In
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {viewMode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isEmailLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-gray-600 dark:text-slate-400"
                >
                  Remember your password?{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300">
                    Log In
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Verify Code Form */}
          {viewMode === 'verify-code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6 mb-6">
              {/* Warning message */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <span className="font-semibold">Check your inbox!</span>
                  <br />
                  We sent a 6-digit code to <span className="font-medium">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setVerificationCode(value)
                  }}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest font-bold border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={isEmailLoading || verificationCode.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isEmailLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify & Create Account'
                )}
              </button>

              {/* Resend code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signup')
                    setVerificationCode('')
                    setCanCloseModal(true)
                    toast('You can request a new code', { icon: 'ℹ️' })
                  }}
                  className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Didn't receive the code?{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    Go back
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Divider - Only show in login mode */}
          {viewMode === 'login' && (
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>
          )}

          {/* Social Login Methods - Only show in login mode */}
          {viewMode === 'login' && (
            <div className="space-y-4">
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-900 dark:text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-base">Continue with Google</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Quick and secure</div>
                </div>
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
          )}

          {/* Sign Up Link - Only show in login mode */}
          {viewMode === 'login' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300"
                >
                  Create Account
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
