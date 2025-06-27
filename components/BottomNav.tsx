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
import { useUserContext } from '@/lib/contexts/UserContext'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import SolanaRateDisplay from '@/components/SolanaRateDisplay'
import Avatar from '@/components/Avatar'
import { MobileWalletConnect } from '@/components/MobileWalletConnect'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useUserContext()
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

  const handleDisconnect = () => {
    disconnect()
    setIsMenuOpen(false)
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/30 z-50 bottom-safe shadow-lg">
        <div className="grid grid-cols-5 h-14">
          {navItems.map((item) => {
            const isItemActive = isActive(item.href)
            const Icon = isItemActive ? item.activeIcon : item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-0.5 relative ${
                  isItemActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile menu modal */}
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
                  <div className="w-full">
                    <MobileWalletConnect 
                      inMenu={true}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 