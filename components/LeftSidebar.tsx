'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { NavItem } from './ui/NavItem'
import Avatar from './Avatar'
import { MobileWalletConnect } from './MobileWalletConnect'
import LogInMethodPopup from './LogInMethodPopup'
import ConnectWalletPopup from './ConnectWalletPopup'
import { 
  HomeIcon, 
  UsersIcon, 
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  BookmarkIcon,
  PlusIcon,
  // CurrencyDollarIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  SparklesIcon,
  XMarkIcon,
  ShoppingBagIcon,
  WalletIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeSolidIcon,
  ChatBubbleLeftEllipsisIcon as ChatSolidIcon,
  BellIcon as BellSolidIcon
} from '@heroicons/react/24/solid'
import { RssIcon } from '@heroicons/react/24/outline'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser } from '@/lib/store/appStore'
import { unreadMessagesService } from '@/lib/services/UnreadMessagesService'
import { toast } from 'react-hot-toast'
import { getProfileLink } from '@/lib/utils/links'
import CreatePostModal from './CreatePostModal'

interface LeftSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isMobile?: boolean
}

export function LeftSidebar({ isOpen = true, onClose, isMobile = false }: LeftSidebarProps) {
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [showConnectWalletPopup, setShowConnectWalletPopup] = useState(false)
  const [activeGenerations, setActiveGenerations] = useState(0)
  const { connected, disconnect, publicKey } = useWallet()
  const [deletedPostsCount, setDeletedPostsCount] = useState(0);
  const publicKeyString = publicKey?.toBase58() ?? null
  const { setVisible } = useSafeWalletModal()
  const user = useUser()
  const router = useRouter()
  
  // Проверяем, является ли пользователь Telegram или гостевым пользователем
  const isTelegramUser = user?.wallet?.startsWith('TG_')
  const isGuestUser = user?.wallet?.startsWith('FK_')
  const needsWalletConnection = isTelegramUser || isGuestUser

  // Unread messages subscription
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = unreadMessagesService.subscribe((count) => {
      setUnreadMessages(count)
    })

    // Initial load
    unreadMessagesService.refresh()

    // Refresh on window focus
    const handleFocus = () => {
      unreadMessagesService.refresh()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?.id])


  useEffect(() => {
    if (!user?.id) return
    const fetchDeletedPostsCount = async () => {
      if(localStorage.getItem('deletedPostsCount') !== null) {
        setDeletedPostsCount(parseInt(localStorage.getItem('deletedPostsCount') || '0'))
        console.log('Deleted posts count:', localStorage.getItem('deletedPostsCount'))
        return
      }
      const response = await fetch(`/api/posts/restore?userId=${user.id}`)
      const data = await response.json()
      setDeletedPostsCount(data.count)
      localStorage.setItem('deletedPostsCount', data.count.toString())
      console.log('Deleted posts count:', data.count)
    }
    fetchDeletedPostsCount()
  }, [user?.id])

  // Check for active Sora generations
  useEffect(() => {
    if (!user?.id) return

    const checkActiveGenerations = async () => {
      try {
        const response = await fetch(`/api/posts?creatorId=${user.id}&type=ai-video&limit=10`)
        if (response.ok) {
          const data = await response.json()
          // Фильтруем посты в процессе генерации или недавно завершенные/отклоненные
          const activePosts = data.posts?.filter((post: any) => 
            post.type === 'ai-video' && 
            (!post.mediaUrl || post.requestStatus === 'processing' || post.requestStatus === 'failed')
          ) || []
          setActiveGenerations(activePosts.length)
        }
      } catch (error) {
        console.error('Error checking active generations:', error)
      }
    }

    checkActiveGenerations()
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(checkActiveGenerations, 30000)
    
    return () => clearInterval(interval)
  }, [user?.id])

  const handleWalletClick = () => {
    if (!connected) {
      setVisible(true)
      toast.success('Подключите кошелек для доступа к функциям')
    } else {
      // TODO: Navigate to wallet page or show wallet modal
      toast.success('Wallet функционал в разработке')
    }
    if (isMobile && onClose) onClose()
  }

  const handleCreateClick = () => {
    if (!connected) {
      setVisible(true)
      toast.success('Подключите кошелек для создания поста')
      return
    }
    setShowCreateModal(true)
    if (isMobile && onClose) onClose()
  }

  const handleLogout = async () => {
    try {
      if (connected) {
        await disconnect()
      }
      // Clear user data
      localStorage.clear()
      toast.success('Вы вышли из аккаунта')
      router.push('/')
      if (isMobile && onClose) onClose()
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Ошибка при выходе')
    }
  }

  const handleNavItemClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  const sidebarClasses = isMobile
    ? `fixed inset-0 z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'hidden md:block fixed left-0 top-0 h-screen w-[220px]'

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        <div className="h-full w-[220px] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-y-auto">
          {/* Hidden MobileWalletConnect for wallet adapter button */}
          <div className="hidden">
            <MobileWalletConnect />
          </div>

          {/* HEADER */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-700">
            <Link href="/feed" className="flex items-center gap-2 group" onClick={handleNavItemClick}>
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
                  <span className="text-gray-900 dark:text-white font-black text-lg">F</span>
                </div>
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Fonana
              </span>
            </Link>
            {isMobile && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
              </button>
            )}
          </div>

          {/* PRIMARY NAVIGATION */}
          <nav className="px-3 py-4 space-y-1">
            {/* Закомментировано - пока не нужно
            <div onClick={handleNavItemClick}>
              <NavItem href="/" icon={HomeIcon} label="Home" />
            </div>
            */}
            <div onClick={handleNavItemClick}>
              <NavItem href="/creators" icon={UsersIcon} label="Explore" />
            </div>
            <div onClick={handleNavItemClick}>
              <NavItem href="/feed" icon={RssIcon} label="Feed" />
            </div>
            <div onClick={handleNavItemClick}>
              <NavItem 
                href="/messages" 
                icon={ChatBubbleLeftEllipsisIcon} 
                label="Messages" 
                badge={unreadMessages}
              />
            </div>
            {connected && user && (
              <>
                <div onClick={handleNavItemClick}>
                  <NavItem href="/notifications" icon={BellIcon} label="Notifications" />
                </div>
                <div onClick={handleNavItemClick}>
                  <NavItem href="/bookmarks" icon={BookmarkIcon} label="Library" />
                </div>
                <div onClick={handleNavItemClick}>
                  <NavItem href="/purchases" icon={ShoppingBagIcon} label="Purchases" />
                </div>
              </>
            )}
            <NavItem 
              icon={PlusIcon} 
              label="Create" 
              onClick={handleCreateClick}
            />
            {activeGenerations > 0 && (
              <div onClick={handleNavItemClick}>
                <NavItem 
                  href="/sora-generation" 
                  icon={SparklesIcon} 
                  label="Sora-Generation" 
                  badge={activeGenerations}
                />
              </div>
            )}
          </nav>

          {/* DIVIDER */}
          <div className="mx-6 my-2 border-t border-gray-200 dark:border-slate-700" />

          {/* SECONDARY NAVIGATION */}
          <nav className="px-3 py-4 space-y-1">
            {/* Закомментировано - не нужны пока
            <NavItem 
              icon={CurrencyDollarIcon} 
              label="Your Wallet" 
              onClick={handleWalletClick}
            />
            */}
            <div onClick={handleNavItemClick}>
              <NavItem href="/support" icon={QuestionMarkCircleIcon} label="Help & Support" />
            </div>
          </nav>

          {/* DIVIDER */}
          <div className="mx-6 my-2 border-t border-gray-200 dark:border-slate-700" />

          {/* CREATOR TOOLS (if user is creator and connected) */}
          {connected && user?.isCreator && (
            <>
              <nav className="px-3 py-4 space-y-1">
                <div onClick={handleNavItemClick}>
                  <NavItem href="/dashboard" icon={ChartBarIcon} label="Dashboard" />
                </div>
                
                {/* Deleted Posts - показываем только если есть удалённые посты */}
                {deletedPostsCount > 0 && (
                  <div onClick={handleNavItemClick}>
                    <NavItem 
                      href="/deleted-posts" 
                      icon={TrashIcon} 
                      label="Deleted Posts" 
                      badge={deletedPostsCount}
                    />
                  </div>
                )}
                
                {/* Закомментировано - не нужно пока
                <div onClick={handleNavItemClick}>
                  <NavItem href="/dashboard/ai-training" icon={SparklesIcon} label="AI Training" />
                </div>
                */}
              </nav>
              <div className="mx-6 my-2 border-t border-gray-200 dark:border-slate-700" />
            </>
          )}

          {/* ACTIONS */}
          {connected && user && (
            <nav className="px-3 py-4 space-y-2">
              {/* Connect Wallet для Telegram и гостевых пользователей */}
              {needsWalletConnection && (
                <NavItem 
                  icon={WalletIcon} 
                  label="Connect Wallet" 
                  onClick={() => {
                    setShowConnectWalletPopup(true)
                    if (isMobile && onClose) onClose()
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                />
              )}
              
              {/* Logout */}
              <NavItem 
                icon={ArrowRightOnRectangleIcon} 
                label="Logout" 
                onClick={handleLogout}
              />
            </nav>
          )}

          {/* SPACER */}
          <div className="flex-1" />

          {/* PROFILE (BOTTOM) */}
          {connected && user && (
            <div className="p-4 border-t border-gray-200 dark:border-slate-700">
              <Link 
                href={getProfileLink(user)}
                onClick={handleNavItemClick}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-full h-full rounded-full border-2 border-gradient-to-r from-purple-500 to-pink-500 p-0.5 group-hover:scale-105 transition-transform">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.nickname || user.fullName || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {(user.nickname || user.fullName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.fullName || user.nickname || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    @{user.nickname || 'user'}
                  </p>
                </div>
              </Link>
            </div>
          )}

          {/* NOT CONNECTED STATE */}
          {!connected && (
            <div className="p-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowLoginPopup(true)
                  if (isMobile && onClose) onClose()
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-[1.02] shadow-md"
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)}
          onPostCreated={() => {
            // toast.success('Пост успешно создан!')
            setShowCreateModal(false)
            
            // Refresh posts
            const event = new CustomEvent('postsUpdated', {
              detail: { timestamp: Date.now() }
            })
            window.dispatchEvent(event)
          }}
        />
      )}

      {/* Login Method Popup */}
      <LogInMethodPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        onPhantomLogin={() => setVisible(true)}
      />

      {/* Connect Wallet Popup for Telegram and Guest Users */}
      {needsWalletConnection && user?.wallet && (
        <ConnectWalletPopup
          isOpen={showConnectWalletPopup}
          onClose={() => setShowConnectWalletPopup(false)}
          currentWallet={user.wallet}
          userType={isGuestUser ? 'guest' : 'telegram'}
        />
      )}
    </>
  )
}

