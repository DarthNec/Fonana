'use client'

import { useState, useEffect } from 'react'
import LogInMethodPopup from './LogInMethodPopup'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { usePathname } from 'next/navigation'

/**
 * AutoLoginPrompt - Автоматически показывает модалку авторизации
 * при первом заходе неавторизованного пользователя
 * 
 * Логика:
 * - Показывать: user === null И connected === false И НЕТ флага в localStorage
 * - Скрывать: Если установлен флаг localStorage.getItem('show_login_screen') === 'true'
 * 
 * Паттерн: Аналогичен NewUserProfileSetup (global component в ClientShell)
 */
export default function AutoLoginPrompt() {
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const user = useUser()
  const { connected } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const pathname = usePathname()

  // Страницы, где НЕ показывать модалку
  const excludedPages = ['/ref', '/download']
  const shouldExclude = excludedPages.some(page => pathname?.startsWith(page))

  useEffect(() => {
    console.log('[AutoLoginPrompt] Checking if login prompt should show...')
    console.log('[AutoLoginPrompt] user:', !!user)
    console.log('[AutoLoginPrompt] connected:', connected)
    console.log('[AutoLoginPrompt] pathname:', pathname)
    console.log('[AutoLoginPrompt] shouldExclude:', shouldExclude)

    // 🚫 НЕ показывать на исключённых страницах
    if (shouldExclude) {
      console.log('[AutoLoginPrompt] ⏭️ Excluded page, skipping')
      return
    }

    // ✅ Задержка для предотвращения race condition с WalletStoreSync
    const timer = setTimeout(() => {
      // 1. Проверяем флаг в localStorage (с fallback на sessionStorage)
      let hasSeenLoginPopup = false
      try {
        hasSeenLoginPopup = 
          localStorage.getItem('show_login_screen') === 'true' ||
          sessionStorage.getItem('show_login_screen') === 'true'
      } catch (error) {
        console.error('[AutoLoginPrompt] localStorage access error:', error)
        // В приватном режиме localStorage может быть недоступен
        hasSeenLoginPopup = false
      }

      console.log('[AutoLoginPrompt] hasSeenLoginPopup:', hasSeenLoginPopup)

      // 2. Условие показа:
      //    - Пользователь НЕ авторизован (user === null И connected === false)
      //    - Ещё НЕ видел модалку (hasSeenLoginPopup === false)
      if (!hasSeenLoginPopup && !user && !connected) {
        console.log('[AutoLoginPrompt] ✅ Opening login popup')
        setShowLoginPopup(true)
      } else {
        console.log('[AutoLoginPrompt] ⏭️ Skipping login popup:', {
          hasSeenLoginPopup,
          hasUser: !!user,
          isConnected: connected
        })
      }
    }, 500) // 500ms задержка для загрузки user через WalletStoreSync

    return () => clearTimeout(timer)
  }, [user, connected, pathname, shouldExclude])

  const handleClose = () => {
    console.log('[AutoLoginPrompt] User closed login popup')

    // Сохраняем флаг, что пользователь видел модалку
    try {
      localStorage.setItem('show_login_screen', 'true')
      console.log('[AutoLoginPrompt] Flag saved to localStorage')
    } catch (error) {
      console.error('[AutoLoginPrompt] localStorage save error:', error)
      // Fallback: используем sessionStorage в приватном режиме
      try {
        sessionStorage.setItem('show_login_screen', 'true')
        console.log('[AutoLoginPrompt] Flag saved to sessionStorage (fallback)')
      } catch (sessionError) {
        console.error('[AutoLoginPrompt] sessionStorage save error:', sessionError)
      }
    }

    setShowLoginPopup(false)
  }

  const handleLoginSuccess = () => {
    console.log('[AutoLoginPrompt] User successfully logged in')

    // Также сохраняем флаг при успешной авторизации
    try {
      localStorage.setItem('show_login_screen', 'true')
      console.log('[AutoLoginPrompt] Flag saved to localStorage after login')
    } catch (error) {
      console.error('[AutoLoginPrompt] localStorage save error:', error)
      try {
        sessionStorage.setItem('show_login_screen', 'true')
        console.log('[AutoLoginPrompt] Flag saved to sessionStorage (fallback)')
      } catch (sessionError) {
        console.error('[AutoLoginPrompt] sessionStorage save error:', sessionError)
      }
    }

    setShowLoginPopup(false)
  }

  // Не рендерим, если модалка не нужна
  if (!showLoginPopup) {
    return null
  }

  return (
    <LogInMethodPopup
      isOpen={showLoginPopup}
      onClose={handleClose}
      onPhantomLogin={() => setVisible(true)}
      onLoginSuccess={handleLoginSuccess}
    />
  )
}
