'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  PlusCircleIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  PlusCircleIcon as PlusCircleSolidIcon,
  UserIcon as UserSolidIcon,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisSolidIcon
} from '@heroicons/react/24/solid'
import { useUser } from '@/lib/store/appStore'
import { useState } from 'react'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import CreatePostModal from '@/components/CreatePostModal'
import { toast } from 'react-hot-toast'
import SearchModal from '@/components/SearchModal'
import { useWallet } from '@/lib/hooks/useSafeWallet'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { publicKey } = useWallet()
  const publicKeyString = publicKey?.toBase58() ?? null
  const { setVisible } = useSafeWalletModal()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const user = useUser()

  const navItems = [
    {
      name: 'Feed',
      href: '/feed',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon
    },
    {
      name: 'Search',
      href: '#',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassIcon,
      onClick: () => setShowSearchModal(true)
    },
    {
      name: 'Create',
      href: '#',
      icon: PlusCircleIcon,
      activeIcon: PlusCircleSolidIcon,
      onClick: () => {
        if (!publicKeyString) {
          setVisible(true)
          toast.success('Подключите кошелек для создания поста')
          return
        }
        setShowCreateModal(true)
      }
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftEllipsisIcon,
      activeIcon: ChatBubbleLeftEllipsisSolidIcon
    },
    // Profile показывается только для авторизованных пользователей
    ...(user && publicKeyString ? [{
      name: 'Profile',
      href: `/creator/${user.id}`,
      icon: UserIcon,
      activeIcon: UserSolidIcon
    }] : [
      {
        name: 'Profile',
        href: `/creator/no-wallet`,
        icon: UserIcon,
        activeIcon: UserSolidIcon
      }
    ])
  ]

  const isActive = (href: string) => {
    // Если мы на главной странице "/", всегда возвращаем false
    if (pathname === '/') return false
    
    if (href === '/feed' && pathname === '/feed') return true
    if (href === '/messages' && pathname.startsWith('/messages')) return true
    if (href.startsWith('/creator/') && pathname.startsWith('/creator/')) {
      // Для профиля проверяем точное совпадение ID
      const hrefId = href.split('/creator/')[1]
      const pathnameId = pathname.split('/creator/')[1]
      return hrefId === pathnameId
    }
    return pathname === href
  }


  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/30 z-50 bottom-safe shadow-lg">
        <div className="grid grid-cols-5 h-14">
          {navItems.map((item) => {
            const isItemActive = isActive(item.href)
            console.log('[BottomNav] isItemActive:', isItemActive, item.href, pathname)
            const Icon = isItemActive ? item.activeIcon : item.icon
            
            // Для кнопок с href='#' используем button, для остальных Link
            if (item.href === '#') {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center gap-0.5 relative w-full h-full ${
                    isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-7 h-6" />
                  </div>
                  { /* <span className="text-xs">{item.name}</span> */ }
                </button>
              )
            }
            
            // Специальная обработка для Profile - показываем аватар если пользователь подключен
            if (item.name === 'Profile' && user && publicKeyString) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-center relative w-full h-full ${
                    isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border border-purple-500 p-0.5">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.nickname || 'User'} 
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
                </Link>
              )
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 relative w-full h-full ${
                  isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-7 h-7" />
                </div>
                { /* <span className="text-xs">{item.name}</span> */ }
              </Link>
            )
          })}
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

      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  )
} 