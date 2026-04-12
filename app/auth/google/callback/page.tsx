'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/lib/store/appStore'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'
import { useWalletStore } from '@/lib/store/walletStore'
import { jwtManager } from '@/lib/utils/jwt'
import toast from 'react-hot-toast'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAppStore(state => state.setUser)
  const { loadSubscriptions } = useSubscriptionStore()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function handleGoogleCallback() {
      if (isProcessing) return
      setIsProcessing(true)

      try {
        // Получаем email из URL параметров (передаётся NextAuth)
        const email = searchParams.get('email')
        
        console.log('🔴 [GOOGLE CALLBACK] Processing callback...', { email })

        // Даём NextAuth немного времени завершить signIn callback
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Получаем пользователя из БД по email
        if (!email) {
          throw new Error('No email in callback URL')
        }

        const userLookupResponse = await fetch(`/api/auth/google/user?email=${encodeURIComponent(email)}`)
        
        if (!userLookupResponse.ok) {
          throw new Error('Failed to find user')
        }

        const { user, isNewUser } = await userLookupResponse.json()

        if (!user || !user.wallet) {
          throw new Error('Invalid user data')
        }

        console.log('🔴 [GOOGLE CALLBACK] User found:', {
          userId: user.id,
          nickname: user.nickname,
          wallet: user.wallet
        })

        // 1. СОХРАНЯЕМ FAKE WALLET В LOCALSTORAGE
        localStorage.setItem('fonana_user_wallet', user.wallet)
        localStorage.setItem('fonana_google_auth', 'true')
        console.log('🔴 [GOOGLE CALLBACK] Wallet saved to localStorage:', user.wallet)

        // 2. ПОЛУЧАЕМ JWT TOKEN
        console.log('🔴 [GOOGLE CALLBACK] Getting JWT token...')
        const token = await jwtManager.getToken()
        if (token) {
          console.log('🔴 [GOOGLE CALLBACK] JWT token ready')
          useAppStore.getState().setJwtReady(true)
        } else {
          throw new Error('Failed to get JWT token')
        }

        // 3. СОХРАНЯЕМ ПОЛЬЗОВАТЕЛЯ В STORE
        setUser(user)
        
        if (isNewUser) {
          console.log('🔴 [GOOGLE CALLBACK] New user, setting flag')
          localStorage.setItem('fonana_is_new_user', 'true')
        }

        // 4. ЭМУЛИРУЕМ ПОДКЛЮЧЕННЫЙ КОШЕЛЕК
        console.log('🔴 [GOOGLE CALLBACK] Emulating connected wallet...')
        useWalletStore.getState().updateState({
          connected: true,
          publicKey: null,
          connecting: false,
          disconnecting: false,
          wallet: null
        })

        // 5. ЗАГРУЖАЕМ SUBSCRIPTIONS
        loadSubscriptions(user.id)

        // 6. ЗАГРУЖАЕМ LIKES
        if (user.id) {
          const likesResponse = await fetch(`/api/likes/user?userId=${user.id}`)
          if (likesResponse.ok) {
            const likesData = await likesResponse.json()
            console.log('🔴 [GOOGLE CALLBACK] User likes loaded:', likesData?.length || 0)
            localStorage.setItem('user_likes', JSON.stringify(likesData || []))
          }
        }

        // 7. SUCCESS
        const welcomeMessage = isNewUser
          ? `Welcome, ${user.nickname}! 🎉`
          : `Welcome back, ${user.nickname}! 👋`
        
        toast.success(welcomeMessage, {
          duration: 3000,
          position: 'top-center',
        })

        console.log('🔴 [GOOGLE CALLBACK] Redirecting to feed...')
        router.push('/feed')

      } catch (error) {
        console.error('🔴 [GOOGLE CALLBACK] Error:', error)
        toast.error(
          error instanceof Error ? error.message : 'Failed to complete Google authentication',
          { duration: 4000, position: 'top-center' }
        )
        router.push('/')
      }
    }

    handleGoogleCallback()
  }, [searchParams, router, setUser, loadSubscriptions, isProcessing])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-purple-200/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-600 border-r-red-600 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Completing Google Sign In...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  )
}
