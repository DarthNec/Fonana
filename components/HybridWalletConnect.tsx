'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState, useCallback } from 'react'
import { generateSignMessage, detectWalletEnvironment } from '@/lib/auth/solana'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { WalletIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import bs58 from 'bs58'

export function HybridWalletConnect() {
  const { connected, connect, disconnect, wallet, publicKey, signMessage } = useWallet()
  const { user, refreshUser } = useUser()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showUXHint, setShowUXHint] = useState(false)
  
  // Проверяем JWT авторизацию при загрузке
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Определяем окружение
  useEffect(() => {
    const env = detectWalletEnvironment()
    
    // Показываем подсказку если в встроенном браузере
    if (env.isInWalletBrowser && !env.isMobile) {
      setShowUXHint(true)
      setTimeout(() => setShowUXHint(false), 10000) // Скрываем через 10 секунд
    }
  }, [])

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

  // Стандартная кнопка для неавторизованных
  return (
    <div className="relative">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      
      {/* UX подсказка */}
      {showUXHint && (
        <div className="absolute top-full mt-2 right-0 w-72 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 Для лучшего опыта рекомендуем открыть сайт в обычном браузере
          </p>
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