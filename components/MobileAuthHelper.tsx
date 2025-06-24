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
  
  const openInBrowser = () => {
    const currentUrl = window.location.href
    
    // Пытаемся открыть в Safari на iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.location.href = `safari-${currentUrl}`
      toast('Откройте эту ссылку в Safari', { icon: '🌐' })
    } 
    // Пытаемся открыть в Chrome на Android
    else if (/Android/.test(navigator.userAgent)) {
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
      toast('Откройте эту ссылку в Chrome', { icon: '🌐' })
    }
    // Для других устройств копируем ссылку
    else {
      navigator.clipboard.writeText(currentUrl)
      toast.success('Ссылка скопирована! Откройте в браузере')
    }
  }
  
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl shadow-lg animate-slide-up">
      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
        🔐 Авторизация в другом браузере?
      </h3>
      
      <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
        Если вы авторизовались через Phantom, используйте одну из опций ниже:
      </p>
      
      <div className="space-y-2">
        {/* Кнопка открытия в браузере */}
        <button
          onClick={openInBrowser}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Открыть в браузере
        </button>
        
        {/* Кнопки синхронизации */}
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
            title="Скопировать ссылку для авторизации"
          >
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <DocumentDuplicateIcon className="w-4 h-4" />
            )}
          </button>
        </div>
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