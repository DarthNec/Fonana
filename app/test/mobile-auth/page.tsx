'use client'

import { HybridWalletConnect } from '@/components/HybridWalletConnect'
import { useAuth } from '@/lib/hooks/useAuth'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import { useEffect, useState } from 'react'

export default function MobileAuthTestPage() {
  const { isAuthenticated, user } = useAuth()
  const [environment, setEnvironment] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  
  useEffect(() => {
    const env = detectWalletEnvironment()
    setEnvironment(env)
    
    const storedToken = localStorage.getItem('fonana-jwt')
    setToken(storedToken)
  }, [])
  
  const clearAuthData = () => {
    localStorage.removeItem('fonana-jwt')
    document.cookie = 'fonana-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    window.location.reload()
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Тестирование мобильной авторизации</h1>
      
      {/* Статус авторизации */}
      <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Статус авторизации</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Авторизован:</span>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? 'Да ✅' : 'Нет ❌'}
            </span>
          </p>
          {user && (
            <>
              <p><span className="font-medium">ID:</span> {user.id}</p>
              <p><span className="font-medium">Кошелек:</span> {user.wallet}</p>
              <p><span className="font-medium">Никнейм:</span> {user.nickname}</p>
            </>
          )}
        </div>
      </div>
      
      {/* Информация об окружении */}
      <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Окружение</h2>
        {environment && (
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Мобильное устройство:</span> {environment.isMobile ? 'Да' : 'Нет'}</p>
            <p><span className="font-medium">В браузере кошелька:</span> {environment.isInWalletBrowser ? 'Да' : 'Нет'}</p>
            <p><span className="font-medium">Phantom:</span> {environment.isPhantom ? 'Да' : 'Нет'}</p>
            <p><span className="font-medium">Solflare:</span> {environment.isSolflare ? 'Да' : 'Нет'}</p>
            <p><span className="font-medium">User Agent:</span> {environment.userAgent}</p>
          </div>
        )}
      </div>
      
      {/* JWT токен */}
      <div className="mb-8 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">JWT токен в localStorage</h2>
        <div className="space-y-2">
          <p className="font-medium">{token ? 'Найден ✅' : 'Отсутствует ❌'}</p>
          {token && (
            <p className="text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {token.substring(0, 50)}...
            </p>
          )}
        </div>
      </div>
      
      {/* Кнопки действий */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <HybridWalletConnect />
        </div>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Обновить страницу
          </button>
          
          <button
            onClick={clearAuthData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Очистить авторизацию
          </button>
        </div>
      </div>
      
      {/* Инструкции */}
      <div className="mt-12 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">📱 Инструкция для тестирования</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Откройте эту страницу на мобильном устройстве</li>
          <li>Нажмите кнопку "Connect"</li>
          <li>Вас перенаправит в Phantom wallet</li>
          <li>Подтвердите подключение и подпись</li>
          <li>После успеха вернитесь в браузер</li>
          <li>Если не авторизованы - нажмите "Синхронизировать" в помощнике</li>
          <li>Или обновите страницу вручную</li>
        </ol>
      </div>
    </div>
  )
} 