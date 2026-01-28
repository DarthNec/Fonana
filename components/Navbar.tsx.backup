'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import Avatar from './Avatar'
import NotificationsDropdown from './NotificationsDropdown'
import SolanaRateDisplay from './SolanaRateDisplay'
import CreatePostModal from './CreatePostModal'
import { 
  HomeIcon, 
  UsersIcon, 
  PlusIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Cog6ToothIcon,
  ChatBubbleLeftEllipsisIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { MobileWalletConnect } from './MobileWalletConnect'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser } from '@/lib/store/appStore'
import SearchModal from './SearchModal'
import { unreadMessagesService } from '@/lib/services/UnreadMessagesService'
import { toast } from 'react-hot-toast'
import { getProfileLink } from '@/lib/utils/links'
import { isPlaywrightTestMode } from '@/lib/test/playwright-detection'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Creators', href: '/creators', icon: UsersIcon },
  { name: 'Feed', href: '/feed', icon: HomeIcon },
  { name: 'Messages', href: '/messages', isAction: true, icon: ChatBubbleLeftEllipsisIcon, hasIndicator: true },
  { name: 'Create', href: '#', icon: PlusIcon, isAction: true },
] // { name: '', href: '/version-check', icon: RocketLaunchIcon, isNew: false },

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showSolanaRate, setShowSolanaRate] = useState(true)
  const { connected, disconnect, publicKey } = useWallet()
  const publicKeyString = publicKey?.toBase58() ?? null // 🔥 ALTERNATIVE FIX: Stable string
  const { setVisible } = useSafeWalletModal()
  const user = useUser()
  const [apiUser, setApiUser] = useState(null)
  
  // 🔥 ЛОГИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ В NAVBAR (только при изменении)
  useEffect(() => {
    console.log(`User in Navbar:`, user)
    // console.log('🎯 [NAVBAR] User state changed:')
    // console.log('📊 Global User from Zustand:', {
    //   hasUser: !!user,
    //   id: user?.id,
    //   wallet: user?.wallet,
    //   nickname: user?.nickname,
    //   fullName: user?.fullName,
    //   avatar: user?.avatar,
    //   isCreator: user?.isCreator,
    //   isVerified: user?.isVerified
    // })
    // if (user) {
    //   console.log('🔍 Complete User Object in Navbar:', JSON.stringify(user, null, 2))
    // }
    // console.log('🎯 [NAVBAR] End of user logging')
  }, [user])
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load Solana Rate display preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('showSolanaRate')
    if (savedPreference !== null) {
      setShowSolanaRate(savedPreference === 'true')
    }
  }, [])

  // Toggle Solana Rate display
  const toggleSolanaRate = () => {
    const newValue = !showSolanaRate
    setShowSolanaRate(newValue)
    localStorage.setItem('showSolanaRate', String(newValue))
  }

  // Subscribe to unread messages - FIXED: [critical_regression_infinite_loop_2025_017]
  useEffect(() => {
    console.log('[Navbar] useEffect triggered, user?.id:', user?.id)
    
    if (!user?.id) {
      console.log('[Navbar] No user ID, skipping subscription')
      return
    }
    
    console.log('[Navbar] Subscribing to unread messages service for user:', user.id)
    const unsubscribe = unreadMessagesService.subscribe((count) => {
      console.log('[Navbar] Received unread count update:', count)
      setUnreadMessages(count)
    })
    
    // Принудительно обновляем счетчик при загрузке
    console.log('[Navbar] Forcing initial refresh')
    unreadMessagesService.refresh()
    
    // Обновляем счетчик при фокусе на окне (когда пользователь возвращается на вкладку)
    const handleFocus = () => {
      console.log('[Navbar] Window focused, refreshing unread count')
      unreadMessagesService.refresh()
    }
    
    window.addEventListener('focus', handleFocus)
    
    // 🔥 DEBUG: Добавляем кнопку для тестирования в development
    if (process.env.NODE_ENV === 'development') {
      (window as any).testUnreadMessages = () => {
        console.log('[Navbar] Manual test triggered')
        unreadMessagesService.refresh()
      }
    }
    
    return () => {
      console.log('[Navbar] Unsubscribing from unread messages service')
      unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?.id])

  const isActive = (href: string) => pathname === href

  // Скрываем Navbar на странице TikTok Video Viewer
  if (pathname === '/videos-carousel') {
    return null
  }

  // Загружаем свежие данные пользователя из API (как делают фид/профиль/карточки)
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user?id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            console.log('[Navbar] Got fresh user data from API:', data.user.avatar)
            
            // 🔥 ЛОГИРОВАНИЕ СВЕЖИХ ДАННЫХ ИЗ API
            console.log('🎯 [NAVBAR API REFRESH] Fresh user data from API:')
            console.log('📊 API User Object:', {
              id: data.user.id,
              wallet: data.user.wallet,
              nickname: data.user.nickname,
              fullName: data.user.fullName,
              avatar: data.user.avatar,
              isCreator: data.user.isCreator,
              isVerified: data.user.isVerified,
              bio: data.user.bio,
              backgroundImage: data.user.backgroundImage,
              followersCount: data.user.followersCount,
              followingCount: data.user.followingCount,
              postsCount: data.user.postsCount
            })
            console.log('🔍 Complete API User Object:', JSON.stringify(data.user, null, 2))
            console.log('🎯 [NAVBAR API REFRESH] End of API user logging')
            
            setApiUser(data.user)
          }
        })
        .catch(err => console.error('[Navbar] Failed to load user data:', err))
    }
  }, [user?.id]) // Убрал apiUser из dependencies чтобы перезагружать при изменениях

  // Используем свежий аватар из API (как делают остальные компоненты) 
  const currentUser = apiUser || user
  const avatarUrl = currentUser?.avatar 
    ? `${currentUser.avatar}?t=${Date.now()}` 
    : undefined

  // Диагностическое логирование (только при изменении)
  useEffect(() => {
    // console.log('[Navbar Debug] Avatar data:', { 
    //   hasGlobalUser: !!user,
    //   hasApiUser: !!apiUser, 
    //   globalAvatar: user?.avatar,
    //   apiAvatar: apiUser && typeof apiUser === 'object' && 'avatar' in apiUser ? (apiUser as any).avatar : null,
    //   finalAvatarUrl: avatarUrl,
    //   timestamp: Date.now() 
    // })
    console.log('[Navbar] DogWater tokens:', user)
  }, [user?.avatar, apiUser, avatarUrl])

  // Check if it's PWA mode
  const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  const handleNavClick = (item: any, e?: React.MouseEvent) => {
    if (item.isAction && item.name === 'Create') {
      e?.preventDefault()
      console.log(connected);
      console.log(user);
      if (!connected) {  
        // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
        setVisible(true)
        toast.success('Подключите кошелек для создания поста')
        return
      }
        
      setShowCreateModal(true)
      setIsOpen(false) // Close mobile menu if open
    }
    else if (item.isAction && item.name === 'Messages') {
      if (!connected) {  
        // 🔥 Открываем модальное окно подключения кошелька вместо ошибки
        setVisible(true)
        toast.success('Подключите кошелек для перехода в сообщения')
        return
      }
      else {
        router.push('/messages')
      }
    }
  }

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isPWA ? 'md:block hidden' : 'block'} ${
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-slate-700/30 shadow-sm' 
          : 'bg-gradient-to-b from-white/50 to-transparent dark:from-slate-900/50 dark:to-transparent backdrop-blur-sm'
      }`}>
        <div className="px-3 sm:px-4 lg:container lg:mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative w-8 sm:w-10 h-8 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <span className="text-gray-900 dark:text-white font-black text-sm sm:text-lg">F</span>
                </div>
              </div>
              <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Fonana
              </span>
            </Link>

            {/* Desktop Navigation - скрываем на мобильных из-за BottomNav */}
            <div className="hidden lg:flex items-center gap-2 flex-1 ml-4">
              <div className="flex items-center gap-2">
                {navigation.map((item) => (
                  item.isAction ? (
                    <button
                      key={item.name}
                      onClick={(e) => handleNavClick(item, e)}
                      className={`relative flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`relative flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                        item.isNew 
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/25 animate-pulse'
                          : isActive(item.href)
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                      {item.hasIndicator && unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                  )
                ))}
              </div>
            </div>

            {/* Desktop Actions - адаптируем для планшетов */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {/* Search Button */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-2xl transition-all duration-300 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                title="Search (Cmd+K)"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>

              {/* Solana Rate Display - с возможностью скрыть */}
              {showSolanaRate && <SolanaRateDisplay />}

              {/* Notifications */}
              
              <NotificationsDropdown />

              {/* Wallet */}
              <div className="wallet-adapter-button-wrapper">
                <MobileWalletConnect />
              </div>

              {/* Profile */}
              {(connected && user) || (isPlaywrightTestMode() && user) ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="relative hover:scale-105 transition-transform duration-300"
                  >
                    <Avatar
                      src={avatarUrl}
                      alt={currentUser?.nickname || 'Profile'}
                      seed={currentUser?.nickname || currentUser?.wallet || ''}
                      size={48}
                      rounded="2xl"
                      className="border-2 border-purple-500/30 hover:border-purple-500/50"
                    />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-slate-700/50 shadow-2xl overflow-hidden">
                      <div className="p-6 border-b border-gray-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={avatarUrl}
                            alt={currentUser?.nickname || 'Profile'}
                            seed={currentUser?.nickname || currentUser?.wallet || ''}
                            size={48}
                            rounded="2xl"
                            className="border border-purple-500/30"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {currentUser?.fullName || currentUser?.nickname || 'User'}
                            </div>
                            <div className="text-gray-600 dark:text-slate-400 text-sm">
                              @{currentUser?.nickname || 'user'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <Link
                          href={getProfileLink({ id: currentUser.id, nickname: currentUser.nickname })}
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <UserIcon className="w-5 h-5" />
                          Profile
                        </Link>
                        <Link
                          href="/support"
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                        >
                          <QuestionMarkCircleIcon className="w-5 h-5" />
                          Support
                        </Link>
                        <Link
                          href="/dashboard/ai-training"
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <SparklesIcon className="w-5 h-5" />
                          AI Portrait Training
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                          Dashboard
                        </Link>
                        
                        {/* Display Settings Section */}
                        <div className="border-t border-gray-200 dark:border-slate-700/50 my-2"></div>
                        
                        <button
                          onClick={toggleSolanaRate}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {showSolanaRate ? (
                              <EyeIcon className="w-5 h-5" />
                            ) : (
                              <EyeSlashIcon className="w-5 h-5" />
                            )}
                            <span>SOL Rate Display</span>
                          </div>
                          <div className={`w-10 h-6 rounded-full transition-colors duration-300 ${
                            showSolanaRate 
                              ? 'bg-purple-600 dark:bg-purple-500' 
                              : 'bg-gray-300 dark:bg-slate-600'
                          } relative`}>
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                              showSolanaRate ? 'translate-x-4' : 'translate-x-0'
                            }`}></div>
                          </div>
                        </button>
                        
                        <div className="border-t border-gray-200 dark:border-slate-700/50 my-2"></div>
                        
                        <button 
                          onClick={() => {
                            disconnect()
                            setIsProfileOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* DogWater Token - Desktop only */}
              
              {/* {(connected && user) ?
              
              <Link
                href="https://gmgn.ai/sol/token/99smS99MkGP8WFggmUZWaVbe18Y8iWuC3YhGtUMMBray"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-2 h-12 px-3 mb-2 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src="https://fonanastorage.b-cdn.net/dogwater/DogWaterLogoBG.png"
                    alt="DogWater Token"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    // @ts-expect-error - Поле dogWaterTokens будет доступно после генерации Prisma Client
                    const tokens = user.dogWaterTokens || 0
                    if (tokens >= 1000) {
                      return `${(tokens / 1000).toFixed(1)}K`
                    }
                    return tokens.toFixed(0)
                  })()}
                </span>
                
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  DogWater token
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900 dark:border-b-slate-700"></div>
                </div>
              </Link> : null} */}
            </div>

            {/* Mobile Actions - Messages & Burger Menu */}
            <div className="md:hidden flex items-center gap-1">
              {/* Burger Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all duration-300"
              >
                {isOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
              {/* Messages Button */}
              <Link
                href="/messages"
                className="relative p-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all duration-300"
              >
                <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse font-medium">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
              <div className="p-4 space-y-2">      
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700/50">
                  {(connected || (isPlaywrightTestMode() && user)) && (
                    <div className="space-y-2">
                      <Link
                        href="/support"
                        className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                      >
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                        Support
                      </Link>
                      <Link
                        href="/dashboard/ai-training"
                        className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                      >
                        <SparklesIcon className="w-5 h-5" />
                        AI Portrait Training
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                      >
                        <Cog6ToothIcon className="w-5 h-5" />
                        Dashboard
                      </Link>
                    </div>
                  )}

                  <div className="wallet-adapter-button-wrapper mb-50">
                    <MobileWalletConnect />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            toast.success('Пост успешно создан!')
  
            // Испускаем событие
            window.dispatchEvent(new CustomEvent('post-created', { 
              detail: { timestamp: Date.now() } 
            }))
            
            if(window.location.pathname !== '/feed') {
              router.push('/feed')
            }
          }}
        />
      )}

      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  )
} 