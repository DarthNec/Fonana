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
      activeIcon: MagnifyingGlassSolidIcon,
      showInPWA: true // Показывать в PWA для замены navbar
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 z-50 bottom-safe">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = active ? item.activeIcon : item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center py-2 text-xs"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 ${
                    active 
                      ? 'text-purple-600 dark:text-purple-400' 
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`mt-1 ${
                  active 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
} 