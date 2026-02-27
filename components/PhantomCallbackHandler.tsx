'use client'

import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { parsePhantomCallback, decryptPhantomPayload } from '@/lib/utils/phantomMobile'
import { useAppStore } from '@/lib/store/appStore'
import { useWalletStore } from '@/lib/store/walletStore'
import { jwtManager } from '@/lib/utils/jwt'
import { detectWalletEnvironment } from '@/lib/auth/solana'

/**
 * Компонент для обработки возврата из Phantom после подключения кошелька
 * Должен быть добавлен в layout или на страницы где ожидается callback
 * 
 * MOBILE ONLY: Срабатывает только когда в URL есть параметры от Phantom
 * Desktop flow не затронут (использует WalletStoreSync)
 */
export function PhantomCallbackHandler() {
  const setUser = useAppStore(state => state.setUser)
  
  useEffect(() => {
    const handleCallback = async () => {
      // Проверяем наличие параметров callback от Phantom
      const callbackData = parsePhantomCallback()
      
      if (!callbackData) {
        // Нет параметров - не callback от Phantom
        return
      }
      
      console.log('[Phantom Callback] Processing connection callback...')
      
      // 🔍 АНАЛИТИКА: Определяем источник подключения
      const env = detectWalletEnvironment()
      console.log('[Phantom Callback] Connection source detected:', {
        isInWalletBrowser: env.isInWalletBrowser,
        isMobile: env.isMobile,
        hasPhantomProvider: env.hasPhantomProvider,
        userAgent: navigator.userAgent,
        source: env.isInWalletBrowser ? 'phantom_app_browser' : 'external_mobile_browser'
      })
      
      // Сохраняем источник для дальнейшей аналитики
      const connectionSource = env.isInWalletBrowser ? 'phantom_app_browser' : 'external_mobile_browser'
      localStorage.setItem('fonana_connection_source', connectionSource)
      
      try {
        // Расшифровываем payload (содержит публичный ключ пользователя)
        const decryptedPayload = decryptPhantomPayload(
          callbackData.data,
          callbackData.nonce,
          callbackData.phantomEncryptionPublicKey
        )
        
        if (!decryptedPayload) {
          throw new Error('Failed to decrypt Phantom payload')
        }
        
        // Парсим JSON
        const payload = JSON.parse(decryptedPayload)
        const publicKey = payload.public_key
        
        if (!publicKey) {
          throw new Error('No public key in Phantom payload')
        }
        
        console.log('[Phantom Callback] User public key:', publicKey.substring(0, 8) + '...')
        
        // Сохраняем публичный ключ в localStorage
        localStorage.setItem('fonana_user_wallet', publicKey)
        
        // 🔥 CRITICAL: Устанавливаем маркер мобильной Phantom авторизации
        // Это позволяет WalletStoreSync эмулировать connected=true после reload
        localStorage.setItem('fonana_phantom_mobile_auth', 'true')
        
        // Обновляем walletStore (эмулируем подключение)
        useWalletStore.getState().updateState({
          connected: true,
          publicKey: null, // На мобильном publicKey не доступен напрямую
          connecting: false,
          disconnecting: false,
          wallet: null
        })
        
        console.log('[Phantom Callback] Wallet state updated')
        
        // Получаем JWT токен
        console.log('[Phantom Callback] Requesting JWT token...')
        const token = await jwtManager.getToken()
        
        if (!token) {
          throw new Error('Failed to get JWT token')
        }
        
        console.log('[Phantom Callback] JWT token obtained')
        
        // Получаем данные пользователя
        const userResponse = await fetch(`/api/auth/token?wallet=${publicKey}`)
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data')
        }
        
        const userData = await userResponse.json()
        
        if (!userData.user) {
          throw new Error('No user data in response')
        }
        
        console.log('[Phantom Callback] User data:', {
          userId: userData.user.id,
          nickname: userData.user.nickname,
          isNewUser: userData.isNewUser
        })
        
        // Сохраняем пользователя в store
        setUser(userData.user)
        
        // Если новый пользователь - показываем onboarding
        if (userData.isNewUser) {
          localStorage.setItem('fonana_is_new_user', 'true')
        }
        
        // Показываем успешное уведомление
        const welcomeMessage = userData.isNewUser 
          ? `Welcome, ${userData.user.nickname}! 🎉`
          : `Welcome back, ${userData.user.nickname}! 👋`
        
        toast.success(welcomeMessage, {
          duration: 3000,
          position: 'top-center',
        })
        
        // Очищаем параметры callback из URL
        const url = new URL(window.location.href)
        url.searchParams.delete('phantom_encryption_public_key')
        url.searchParams.delete('data')
        url.searchParams.delete('nonce')
        
        // 🚀 FULL PAGE RELOAD - гарантирует обновление UI компонентов
        // Mobile only: Десктоп flow не затронут (использует WalletStoreSync)
        console.log('[Phantom Callback] Connection successful, reloading page...')
        window.location.href = '/feed'
        
      } catch (error) {
        console.error('[Phantom Callback] Error processing callback:', error)
        toast.error(
          error instanceof Error 
            ? `Connection error: ${error.message}` 
            : 'Failed to connect wallet',
          { duration: 5000, position: 'top-center' }
        )
        
        // Очищаем параметры callback из URL
        const url = new URL(window.location.href)
        url.searchParams.delete('phantom_encryption_public_key')
        url.searchParams.delete('data')
        url.searchParams.delete('nonce')
        
        // Редиректим на текущую страницу без параметров (с reload для очистки состояния)
        window.location.href = url.pathname || '/feed'
      }
    }
    
    handleCallback()
  }, [setUser])
  
  // Компонент не рендерит ничего
  return null
}
