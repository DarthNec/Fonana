'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useRouter } from 'next/navigation'
import Avatar from './Avatar'
import Link from 'next/link'
import { 
  UserIcon, 
  PencilIcon, 
  PhotoIcon, 
  LinkIcon,
  GlobeAltIcon,
  ChatBubbleLeftEllipsisIcon,
  HeartIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { jwtManager } from '@/lib/utils/jwt'

interface ProfileData {
  id: string
  nickname: string
  fullName?: string
  bio?: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
  location?: string
  isVerified: boolean
  isCreator: boolean
  followersCount: number
  followingCount: number
  postsCount: number
  wallet: string
  solanaWallet?: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePageClient() {
  const user = useUser()
  const router = useRouter()
  const { setVisible } = useSafeWalletModal()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загружаем данные профиля
  useEffect(() => {
    const loadProfileData = async () => {
      console.log('[ProfilePageClient] loadProfileData called, user:', user?.id)
      
      if (!user?.id) {
        console.log('[ProfilePageClient] No user ID, skipping load')
        setLoading(false)
        return
      }

      // 🔥 ПРОВЕРЯЕМ, ЧТО ПОЛЬЗОВАТЕЛЬ ПОЛНОСТЬЮ ЗАГРУЖЕН
      if (!user.wallet) {
        console.log('[ProfilePageClient] User wallet not loaded yet, waiting...')
        // Ждем еще немного для полной загрузки пользователя
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (!user.wallet) {
          console.log('[ProfilePageClient] User wallet still not loaded, showing error')
          setError('Кошелек пользователя не загружен. Попробуйте переподключить кошелек.')
          setLoading(false)
          return
        }
      }

      // 🔥 ЖДЕМ ПОЛНОЙ ИНИЦИАЛИЗАЦИИ ПОЛЬЗОВАТЕЛЯ И КОШЕЛЬКА
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`[ProfilePageClient] Attempt ${attempts}/${maxAttempts} to get token...`)
        
        // Проверяем, есть ли кошелек в localStorage
        const wallet = localStorage.getItem('fonana_user_wallet')
        if (wallet) {
          console.log('[ProfilePageClient] Wallet found, proceeding...')
          break
        }
        
        if (attempts < maxAttempts) {
          console.log('[ProfilePageClient] Wallet not found, waiting 500ms...')
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      // 🔥 ДОБАВЛЯЕМ ДОПОЛНИТЕЛЬНУЮ ЗАДЕРЖКУ ДЛЯ ПОЛНОЙ ИНИЦИАЛИЗАЦИИ
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        console.log('[ProfilePageClient] Getting JWT token...')
        let token = await jwtManager.getToken()
        console.log('[ProfilePageClient] JWT token result:', token ? 'found' : 'not found')
        
        // 🔥 ЕСЛИ ТОКЕНА НЕТ - ПРОБУЕМ ЕЩЕ РАЗ ЧЕРЕЗ 1 СЕКУНДУ
        if (!token) {
          console.log('[ProfilePageClient] No token, waiting 1 second and trying again...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          token = await jwtManager.getToken()
          console.log('[ProfilePageClient] Second attempt JWT token result:', token ? 'found' : 'not found')
        }
        
        if (!token) {
          console.log('[ProfilePageClient] Still no token, checking if we can request one...')
          // Попробуем получить новый токен, используя кошелек из объекта пользователя или localStorage
          let wallet = user.wallet || null
          
          if (!wallet) {
            try {
              wallet = localStorage.getItem('fonana_user_wallet')
              console.log('[ProfilePageClient] Wallet from localStorage:', wallet ? wallet.substring(0, 8) + '...' : 'not found')
            } catch (error) {
              console.error('[ProfilePageClient] Error accessing localStorage:', error)
              setError('Ошибка доступа к локальному хранилищу. Попробуйте перезагрузить страницу.')
              setLoading(false)
              return
            }
          } else {
            console.log('[ProfilePageClient] Wallet from user object:', wallet.substring(0, 8) + '...')
          }
          
          if (wallet) {
            console.log('[ProfilePageClient] Found wallet, requesting new token...')
            try {
              const newToken = await jwtManager.requestNewToken(wallet)
              if (newToken) {
                console.log('[ProfilePageClient] Got new token, proceeding...')
                token = newToken
              } else {
                console.log('[ProfilePageClient] Failed to get new token')
                setError('Не удалось получить токен аутентификации. Попробуйте переподключить кошелек.')
                setLoading(false)
                return
              }
            } catch (error) {
              console.error('[ProfilePageClient] Error requesting new token:', error)
              setError('Ошибка при получении токена. Попробуйте переподключить кошелек.')
              setLoading(false)
              return
            }
          } else {
            console.log('[ProfilePageClient] No wallet found')
            setError('Кошелек не найден. Подключите кошелек для просмотра профиля.')
            setLoading(false)
            return
          }
        }

        if (!token) {
          setError('Не удалось получить токен аутентификации')
          setLoading(false)
          return
        }

        console.log('[ProfilePageClient] Making API request...')
        const response = await fetch(`/api/user?id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('[ProfilePageClient] API response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('[ProfilePageClient] API response data:', data)
          setProfileData(data.user)
        } else {
          const errorText = await response.text()
          console.error('[ProfilePageClient] API error:', errorText)
          setError('Не удалось загрузить данные профиля')
        }
      } catch (error) {
        console.error('[ProfilePageClient] Error loading profile:', error)
        setError('Ошибка при загрузке профиля: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [user?.id])

  // Если пользователь не авторизован, показываем призыв подключить кошелек
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Подключите кошелек
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Для просмотра и редактирования профиля необходимо подключить Solana кошелек
            </p>
            <button
              onClick={() => setVisible(true)}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <UserIcon className="w-5 h-5 mr-2" />
              Подключить кошелек
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Загрузка профиля
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Пожалуйста, подождите...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Показываем ошибку
  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">😞</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ошибка загрузки
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {error || 'Не удалось загрузить данные профиля'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Обновить страницу
              </button>
              <button
                onClick={() => setVisible(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Переподключить кошелек
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-80 overflow-hidden">
        {profileData.backgroundImage ? (
          <>
            <img 
              src={profileData.backgroundImage}
              alt={`${profileData.fullName || profileData.nickname} background`}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-slate-900"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20" />
        )}
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="relative p-6 sm:p-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Avatar
                  src={profileData.avatar}
                  alt={profileData.fullName || profileData.nickname}
                  seed={profileData.nickname || profileData.wallet}
                  size={120}
                  rounded="2xl"
                  className="border-4 border-white dark:border-slate-700 shadow-lg"
                />
                {profileData.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1">
                    <CheckBadgeIcon className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {profileData.fullName || profileData.nickname}
                    </h1>
                    <p className="text-gray-600 dark:text-slate-400 mb-2">
                      @{profileData.nickname}
                    </p>
                    {profileData.bio && (
                      <p className="text-gray-700 dark:text-slate-300 mb-4">
                        {profileData.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Cog6ToothIcon className="w-4 h-4 mr-2" />
                      Настройки
                    </Link>
                    
                    {/* Dashboard кнопка только для мобильного вида */}
                    <Link
                      href="/dashboard"
                      className="sm:hidden inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <HeartIcon className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {profileData.followersCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Подписчики</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <UserIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {profileData.followingCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Подписки</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center col-span-2 md:col-span-1">
            <DocumentTextIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {profileData.postsCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Посты</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/create-post"
              className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <PencilIcon className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-900 dark:text-white">Создать пост</span>
            </Link>
            
            <Link
              href="/messages"
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900 dark:text-white">Сообщения</span>
            </Link>
            
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900 dark:text-white">Панель управления</span>
            </Link>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Информация профиля
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Основная информация</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Никнейм:</span>
                  <span className="font-medium text-gray-900 dark:text-white">@{profileData.nickname}</span>
                </div>
                {profileData.fullName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Полное имя:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{profileData.fullName}</span>
                  </div>
                )}
                {profileData.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Местоположение:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{profileData.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Дата регистрации:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(profileData.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Социальные сети</h3>
              <div className="space-y-2">
                {profileData.website && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Веб-сайт:</span>
                    <a 
                      href={profileData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-purple-600 hover:text-purple-700"
                    >
                      {profileData.website}
                    </a>
                  </div>
                )}
                {profileData.twitter && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Twitter:</span>
                    <a 
                      href={`https://twitter.com/${profileData.twitter}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      @{profileData.twitter}
                    </a>
                  </div>
                )}
                {profileData.telegram && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Telegram:</span>
                    <a 
                      href={`https://t.me/${profileData.telegram}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      @{profileData.telegram}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 