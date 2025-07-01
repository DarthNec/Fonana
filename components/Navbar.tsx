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
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline'
import { MobileWalletConnect } from './MobileWalletConnect'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUserContext } from '@/lib/contexts/UserContext'
import SearchBar from './SearchBar'
import { jwtManager } from '@/lib/utils/jwt'
import { toast } from 'react-hot-toast'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Creators', href: '/creators', icon: UsersIcon },
  { name: 'Feed', href: '/feed', icon: HomeIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftEllipsisIcon, hasIndicator: true },
  { name: 'Create', href: '#', icon: PlusIcon, isAction: true },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { connected, disconnect, publicKey } = useWallet()
  const { user } = useUserContext()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Check for unread messages
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user?.id) return
      
      try {
        const token = await jwtManager.getToken()
        if (!token) return

        const response = await fetch('/api/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const unreadCount = data.conversations.reduce((count: number, conv: any) => 
            count + (conv.unreadCount || 0), 0
          )
          setUnreadMessages(unreadCount)
        }
      } catch (error) {
        console.error('Error checking unread messages:', error)
      }
    }
    
    if (user?.id) {
      checkUnreadMessages()
      // Check every 10 seconds
      const interval = setInterval(checkUnreadMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [user])

  const isActive = (href: string) => pathname === href

  // Добавляем timestamp к аватару для обхода кеширования
  // Используем updatedAt пользователя для стабильного timestamp
  const avatarUrl = user?.avatar 
    ? `${user.avatar}?t=${user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()}` 
    : undefined

  // Check if it's PWA mode
  const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  const handleNavClick = (item: any, e?: React.MouseEvent) => {
    if (item.isAction && item.name === 'Create') {
      e?.preventDefault()
      if (!connected) {
        toast.error('Подключите кошелек для создания поста')
        return
      }
      setShowCreateModal(true)
      setIsOpen(false) // Close mobile menu if open
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
            <div className="hidden lg:flex items-center gap-2 flex-1">
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
                        isActive(item.href)
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

              {/* Search Bar - делаем больше для десктопа */}
              <div className="ml-8 flex-1 max-w-xl">
                <SearchBar 
                  className="w-full"
                  placeholder="Поиск..."
                  showFilters={false}
                />
              </div>
            </div>

            {/* Desktop Actions - адаптируем для планшетов */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {/* Solana Rate Display - теперь всегда */}
              <SolanaRateDisplay />

              {/* Notifications */}
              <NotificationsDropdown />

              {/* Wallet */}
              <div className="wallet-adapter-button-wrapper">
                <MobileWalletConnect />
              </div>

              {/* Profile */}
              {connected && user && (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="relative hover:scale-105 transition-transform duration-300"
                  >
                    <Avatar
                      src={avatarUrl}
                      alt={user.nickname || 'Profile'}
                      seed={user.nickname || user.wallet}
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
                            alt={user.nickname || 'Profile'}
                            seed={user.nickname || user.wallet}
                            size={48}
                            rounded="2xl"
                            className="border border-purple-500/30"
                          />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {user.fullName || user.nickname || 'User'}
                            </div>
                            <div className="text-gray-600 dark:text-slate-400 text-sm">
                              @{user.nickname || 'user'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <UserIcon className="w-5 h-5" />
                          Profile
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                          Dashboard
                        </Link>
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
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all duration-300"
            >
              {isOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
              <div className="p-4 space-y-2">
                {/* Search Bar */}
                <SearchBar 
                  className="mb-4"
                  placeholder="Поиск..."
                  showFilters={false}
                />
                
                {navigation.map((item) => (
                  item.isAction ? (
                    <button
                      key={item.name}
                      onClick={(e) => handleNavClick(item, e)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 w-full text-left`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                      {item.hasIndicator && unreadMessages > 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </Link>
                  )
                ))}
                
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700/50">
                  <div className="wallet-adapter-button-wrapper mb-4">
                    <MobileWalletConnect />
                  </div>
                  
                  {connected && (
                    <div className="space-y-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                      >
                        <UserIcon className="w-5 h-5" />
                        Profile
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
            setShowCreateModal(false)
            toast.success('Пост успешно создан!')
            router.push('/feed')
          }}
        />
      )}
    </>
  )
} 