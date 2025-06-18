'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import Avatar from './Avatar'
import NotificationsDropdown from './NotificationsDropdown'
import { 
  HomeIcon, 
  UsersIcon, 
  PlusIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  RocketLaunchIcon,
  VideoCameraIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
  BookOpenIcon
} from '@heroicons/react/24/outline'
import { MobileWalletConnect } from './MobileWalletConnect'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Creators', href: '/creators', icon: UsersIcon },
  { name: 'Feed', href: '/feed', icon: HomeIcon },
  { name: 'Create', href: '/create', icon: PlusIcon },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { connected, disconnect } = useWallet()
  const { user } = useUser()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (href: string) => pathname === href

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 group-hover:scale-110 transition-transform duration-300">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center">
                <span className="text-gray-900 dark:text-white font-black text-lg">F</span>
              </div>
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fonana
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
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
                    src={user.avatar}
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
                          src={user.avatar}
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
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
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
                      className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
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
  )
} 