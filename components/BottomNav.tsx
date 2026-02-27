'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  HomeIcon, 
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  BookmarkIcon,
  MagnifyingGlassIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PlusCircleIcon,
  ShoppingBagIcon,
  TrashIcon,
  WalletIcon,
  DevicePhoneMobileIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  UserIcon as UserSolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  PlusCircleIcon as PlusCircleSolidIcon,
  ChatBubbleLeftEllipsisIcon as ChatSolidIcon
} from '@heroicons/react/24/solid'
import { useUser, useAppStore } from '@/lib/store/appStore'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { toast } from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import Avatar from '@/components/Avatar'
import CreatePostModal from '@/components/CreatePostModal'
import LogInMethodPopup from '@/components/LogInMethodPopup'
import ConnectWalletPopup from '@/components/ConnectWalletPopup'
import ProfileSetupModal from '@/components/ProfileSetupModal'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { publicKey, disconnect, connected } = useWallet()
  const publicKeyString = publicKey?.toBase58() ?? null
  const { setVisible } = useSafeWalletModal()
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [showConnectWalletPopup, setShowConnectWalletPopup] = useState(false)
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false)
  const [deletedPostsCount, setDeletedPostsCount] = useState(0)
  const user = useUser()
  const clearUser = useAppStore(state => state.clearUser)

  // Проверяем, является ли пользователь Telegram или гостевым пользователем
  const isTelegramUser = user?.wallet?.startsWith('TG_')
  const isGuestUser = user?.wallet?.startsWith('FK_')
  const needsWalletConnection = isTelegramUser || isGuestUser

  const navItems = [
    {
      name: 'Home',
      href: '/feed',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon
    },
    {
      name: 'Explore',
      href: '/creators',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon
    },
    {
      name: 'Create',
      href: '#',
      icon: PlusCircleIcon,
      activeIcon: PlusCircleSolidIcon,
      onClick: () => {
        if (!connected || !user) {
          // Показываем LogInMethodPopup вместо прямого Phantom
          setShowLoginPopup(true)
          return
        }
        setShowCreateModal(true)
      }
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftEllipsisIcon,
      activeIcon: ChatSolidIcon,
      onClick: () => {
        if (!connected || !user) {
          toast.error('Please log in to access messages', {
            duration: 3000
          })
          return
        }
        router.push('/messages')
      }
    },
    {
      name: 'Profile',
      href: '#',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      onClick: () => {
        if (!connected || !user) {
          // Показываем LogInMethodPopup вместо прямого Phantom
          setShowLoginPopup(true)
          return
        }
        setShowProfilePanel(true)
      }
    }
  ]

  // Загрузка deletedPostsCount из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const count = parseInt(localStorage.getItem('deletedPostsCount') || '0')
      setDeletedPostsCount(count)
    }
  }, [user?.id])

  const isActive = (href: string) => {
    if (href === '#') return false
    if (href === '/feed' && pathname === '/feed') return true
    if (href === '/creators' && pathname === '/creators') return true
    if (href === '/messages' && pathname?.startsWith('/messages')) return true
    if (href === '/bookmarks' && pathname === '/bookmarks') return true
    return pathname === href
  }
  
  const handleLogout = async () => {
    try {
      await disconnect()
      clearUser()
      // Очищаем все маркеры авторизации
      localStorage.removeItem('fonana_user_wallet')
      localStorage.removeItem('fonana_jwt_token')
      localStorage.removeItem('fonana_telegram_auth') // Telegram маркер
      localStorage.removeItem('fonana_guest_auth')    // Guest маркер
      localStorage.removeItem('fonana_device_id')     // Device ID для гостей
      localStorage.removeItem('fonana_phantom_mobile_auth') // Mobile Phantom маркер
      setShowProfilePanel(false)
      router.push('/feed')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/30 z-50 bottom-safe shadow-lg">
        <div className="grid grid-cols-5 h-14">
          {navItems.map((item) => {
            const isItemActive = isActive(item.href)
            const Icon = isItemActive ? item.activeIcon : item.icon
            
            // Profile кнопка - показываем аватар если подключен
            if (item.name === 'Profile') {
              if (connected && user) {
                return (
                  <button
                    key={item.name}
                    onClick={item.onClick}
                    className="flex items-center justify-center relative w-full h-full"
                  >
                    <div className={`w-8 h-8 rounded-full overflow-hidden ${showProfilePanel ? 'ring-2 ring-purple-500' : ''}`}>
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.nickname || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {(user.nickname || user.fullName || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              } else {
                return (
                  <button
                    key={item.name}
                    onClick={item.onClick}
                    className="flex flex-col items-center justify-center gap-0.5 relative w-full h-full text-gray-600 dark:text-slate-400"
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                )
              }
            }
            
            // Create кнопка - выделяющаяся розовая
            if (item.name === 'Create') {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center gap-0.5 relative w-full h-full"
                >
                  <div className="w-12 h-12 -mt-4 bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 transition-all duration-200">
                    <PlusCircleIcon className="w-7 h-7 text-white" />
                  </div>
                </button>
              )
            }
            
            // Обычные кнопки - проверяем есть ли onClick
            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center gap-0.5 relative w-full h-full ${
                    isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </button>
              )
            }
            
            // Обычные Link кнопки (без onClick)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 relative w-full h-full ${
                  isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-6 h-6" />
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Profile Side Panel */}
      {showProfilePanel && (
        <>
          {/* Overlay */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setShowProfilePanel(false)}
          />
          
          {/* Panel */}
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-[70] shadow-2xl animate-slideInFromRight">
            {/* Close button */}

            {/*
            <button
              onClick={() => setShowProfilePanel(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
            </button>   
            */}

            
            {/* User Info */}
            <div className="pt-6 px-6 pb-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex flex-col items-center">
                <Avatar
                  src={user?.avatar}
                  alt={user?.fullName || user?.nickname || 'User'}
                  seed={user?.nickname || user?.id || 'user'}
                  size={80}
                  rounded="full"
                  className="mb-4"
                />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {user?.fullName || user?.nickname || 'User'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  @{user?.nickname || 'username'}
                </p>
              </div>
            </div>
            
            {/* Menu Items */}
            <div className="py-4 px-4">
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  router.push(`/creator/${user?.id}`)
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">My Profile</span>
              </button>
              
              {/* Bookmarks - только для пользователей с реальным кошельком */}
              {!needsWalletConnection && (
                <button
                  onClick={() => {
                    setShowProfilePanel(false)
                    router.push('/bookmarks')
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <BookmarkIcon className="w-5 h-5" />
                  <span className="font-medium">Bookmarks</span>
                </button>
              )}
              
              {/* Purchases - только для пользователей с реальным кошельком */}
              {!needsWalletConnection && (
                <button
                  onClick={() => {
                    setShowProfilePanel(false)
                    router.push('/purchases')
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  <span className="font-medium">Purchases</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  router.push('/notifications')
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <BellIcon className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </button>
              
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  setShowProfileSetupModal(true)
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
              
              {/* Lottery - для всех пользователей (авторизованных и гостевых) */}
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  router.push('/lottery')
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                <span className="font-medium">Lottery</span>
              </button>
              
            </div>
            
            {/* Divider */}
            <div className="mx-4 border-t border-gray-200 dark:border-slate-700" />
            
            {/* Help & Logout */}
            <div className="py-4 px-4">
              {/* Deleted Posts для креаторов */}
              {user?.isCreator && deletedPostsCount > 0 && (
                <button
                  onClick={() => {
                    setShowProfilePanel(false)
                    router.push('/deleted-posts')
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors mb-1"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span className="font-medium">Deleted Posts</span>
                  {deletedPostsCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                      {deletedPostsCount}
                    </span>
                  )}
                </button>
              )}
              
              {/* Mobile App */}
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  router.push('/download')
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <DevicePhoneMobileIcon className="w-5 h-5" />
                <span className="font-medium">Mobile App</span>
              </button>
              
              <button
                onClick={() => {
                  setShowProfilePanel(false)
                  router.push('/help')
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
                <span className="font-medium">Help and Support</span>
              </button>
              
              {/* Connect Wallet для Telegram и гостевых пользователей */}
              {needsWalletConnection && (
                <button
                  onClick={() => {
                    setShowProfilePanel(false)
                    setShowConnectWalletPopup(true)
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors font-medium"
                >
                  <WalletIcon className="w-5 h-5" />
                  <span className="font-medium">Connect Wallet</span>
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            setShowCreateModal(false)
            // toast.success('Post created!')
            router.push('/feed')
          }}
        />
      )}

      {/* Login Method Popup */}
      {showLoginPopup && (
        <LogInMethodPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          onPhantomLogin={() => {
            setShowLoginPopup(false)
            setVisible(true)
          }}
          onLoginSuccess={() => {
            setShowLoginPopup(false)
            // После успешного логина панель профиля не открываем автоматически
            // Пользователь сам может кликнуть на аватар снова
          }}
        />
      )}

      {/* Connect Wallet Popup for Telegram and Guest Users */}
      {needsWalletConnection && user?.wallet && (
        <ConnectWalletPopup
          isOpen={showConnectWalletPopup}
          onClose={() => setShowConnectWalletPopup(false)}
          currentWallet={user.wallet}
          userType={isGuestUser ? 'guest' : 'telegram'}
        />
      )}

      {/* Profile Setup Modal */}
      {showProfileSetupModal && (
        <ProfileSetupModal
          isOpen={showProfileSetupModal}
          onClose={() => setShowProfileSetupModal(false)}
          onComplete={(profileData) => {
            setShowProfileSetupModal(false)
            toast.success('Profile updated successfully!')
          }}
          mode="edit"
        />
      )}
    </>
  )
} 