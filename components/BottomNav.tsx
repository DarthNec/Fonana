'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  PlusCircleIcon as PlusCircleSolidIcon,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisSolidIcon,
  UserIcon as UserSolidIcon
} from '@heroicons/react/24/solid'
import { useUser } from '@/lib/hooks/useUser'
import { useState, useEffect } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const [unreadMessages, setUnreadMessages] = useState(0)

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
      name: 'Search',
      href: '/search',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-slate-700/30 z-50 bottom-safe shadow-lg">
      <div className="grid grid-cols-5 h-14">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = active ? item.activeIcon : item.icon
          
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
  )
} 