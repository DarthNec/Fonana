'use client'

import { useEffect, useState } from 'react'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import { DocumentDuplicateIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export function MobileAuthHelper() {
  const [showHelper, setShowHelper] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  useEffect(() => {
    const env = detectWalletEnvironment()
    
    // Показываем помощник если:
    // 1. Мобильное устройство
    // 2. Есть токен в localStorage
    // 3. Но пользователь не авторизован (нет cookie)
    if (env.isMobile) {
      const token = localStorage.getItem('fonana-jwt')
      checkAuthAndShowHelper(token)
    }
  }, [])
  
  const checkAuthAndShowHelper = async (token: string | null) => {
    if (!token) return
    
    try {
      const response = await fetch('/api/auth/wallet')
      const data = await response.json()
      
      if (!data.authenticated) {
        setShowHelper(true)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }
  
  const syncToken = async () => {
    const token = localStorage.getItem('fonana-jwt')
    if (!token) {
      toast.error('Токен не найден')
      return
    }
    
    setIsSyncing(true)
    
    try {
      const response = await fetch('/api/auth/wallet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      if (response.ok) {
        toast.success('Авторизация восстановлена!')
        setShowHelper(false)
        // Перезагружаем страницу для обновления состояния
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('Не удалось синхронизировать')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Ошибка синхронизации')
    } finally {
      setIsSyncing(false)
    }
  }
  
  const copyAuthLink = () => {
    const token = localStorage.getItem('fonana-jwt')
    if (!token) return
    
    const authUrl = new URL(window.location.origin)
    authUrl.searchParams.set('auth_token', token)
    authUrl.searchParams.set('return_path', window.location.pathname)
    
    navigator.clipboard.writeText(authUrl.toString())
    setCopied(true)
    toast.success('Ссылка скопирована!')
    
    setTimeout(() => setCopied(false), 3000)
  }
  
  if (!showHelper) return null
  
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl shadow-lg animate-slide-up">
      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
        🔐 Авторизация в другом браузере?
      </h3>
      
      <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
        Если вы авторизовались через Phantom, нажмите кнопку ниже для синхронизации:
      </p>
      
      <div className="flex gap-2">
        <button
          onClick={syncToken}
          disabled={isSyncing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Синхронизация...
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-4 h-4" />
              Синхронизировать
            </>
          )}
        </button>
        
        <button
          onClick={copyAuthLink}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg font-medium transition-all duration-200"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <DocumentDuplicateIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      
      <button
        onClick={() => setShowHelper(false)}
        className="absolute top-2 right-2 text-purple-500 hover:text-purple-700"
      >
        ✕
      </button>
    </div>
  )
} 