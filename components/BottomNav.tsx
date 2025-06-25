'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  Bars3Icon,
  PlusCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  UserIcon,
  XMarkIcon,
  WalletIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  Bars3Icon as Bars3SolidIcon,
  PlusCircleIcon as PlusCircleSolidIcon,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisSolidIcon,
  UserIcon as UserSolidIcon
} from '@heroicons/react/24/solid'
import { useUser } from '@/lib/hooks/useUser'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import SolanaRateDisplay from '@/components/SolanaRateDisplay'
import Avatar from '@/components/Avatar'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const { publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Check for unread messages
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user?.wallet) return
      
      try {
        const response = await fetch('/api/conversations', {
          headers: {
            'x-user-wallet': user.wallet
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
    
    if (user?.wallet) {
      checkUnreadMessages()
      // Check every 10 seconds
      const interval = setInterval(checkUnreadMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [user?.wallet])

  const navItems = [
    {
      name: 'Feed',
      href: '/feed',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon
    },
    {
      name: 'Menu',
      href: '#',
      icon: Bars3Icon,
      activeIcon: Bars3SolidIcon,
      onClick: () => setIsMenuOpen(true)
    },
    {
      name: 'Create',
      href: '/create',
      icon: PlusCircleIcon,
      activeIcon: PlusCircleSolidIcon
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftEllipsisIcon,
      activeIcon: ChatBubbleLeftEllipsisSolidIcon,
      badge: unreadMessages > 0 ? unreadMessages : null
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      activeIcon: UserSolidIcon
    }
  ]

  const isActive = (href: string) => {
    if (href === '/feed' && pathname === '/') return true
    return pathname === href
  }

  const handleConnect = () => {
    setVisible(true)
    setIsMenuOpen(false)
  }

  const handleDisconnect = () => {
    disconnect()
    setIsMenuOpen(false)
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/30 z-50 bottom-safe shadow-lg">
        <div className="grid grid-cols-5 h-14">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = active ? item.activeIcon : item.icon
            
            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className="relative flex flex-col items-center justify-center py-1.5 text-xs transition-all"
                >
                  <div className="relative">
                    <Icon 
                      className={`w-5 h-5 transition-all ${
                        isMenuOpen
                          ? 'text-purple-600 dark:text-purple-400 scale-110' 
                          : 'text-gray-500 dark:text-slate-500'
                      }`}
                    />
                  </div>
                  <span 
                    className={`mt-0.5 text-[10px] transition-all ${
                      isMenuOpen
                        ? 'text-purple-600 dark:text-purple-400 font-medium' 
                        : 'text-gray-500 dark:text-slate-500'
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              )
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative flex flex-col items-center justify-center py-1.5 text-xs transition-all"
              >
                <div className="relative">
                  <Icon 
                    className={`w-5 h-5 transition-all ${
                      active 
                        ? 'text-purple-600 dark:text-purple-400 scale-110' 
                        : 'text-gray-500 dark:text-slate-500'
                    }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 animate-pulse font-medium">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`mt-0.5 text-[10px] transition-all ${
                    active 
                      ? 'text-purple-600 dark:text-purple-400 font-medium' 
                      : 'text-gray-500 dark:text-slate-500'
                  }`}
                >
                  {item.name}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Menu Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl">
            <div className="p-6 pb-20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl mb-6">
                  <Avatar
                    src={user.avatar}
                    alt={user.fullName || user.nickname || 'User'}
                    seed={user.wallet}
                    size={48}
                    rounded="xl"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.fullName || user.nickname || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {user.nickname ? `@${user.nickname}` : 'Set up your profile'}
                    </p>
                  </div>
                </div>
              )}

              {/* SOL Rate */}
              <div className="mb-6">
                <SolanaRateDisplay />
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <Link
                  href="/search"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                >
                  <MagnifyingGlassIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
                  <span className="text-gray-900 dark:text-white font-medium">Search</span>
                </Link>

                {user?.isCreator && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                  >
                    <CurrencyDollarIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
                    <span className="text-gray-900 dark:text-white font-medium">Creator Dashboard</span>
                  </Link>
                )}

                {/* Wallet Connection */}
                {publicKey ? (
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <span className="text-red-600 dark:text-red-400 font-medium">Disconnect Wallet</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    <WalletIcon className="w-6 h-6" />
                    <span className="font-medium">Connect Wallet</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 