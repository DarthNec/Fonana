'use client'

import { useState } from 'react'
import { WalletButton } from './WalletButton'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="relative z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Логотип */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold neon-text">Fonana</h1>
            </div>
          </div>

          {/* Десктопное меню */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#features" className="text-white hover:text-primary-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Возможности
              </a>
              <a href="#creators" className="text-white hover:text-primary-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Авторы
              </a>
              <a href="#pricing" className="text-white hover:text-primary-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Цены
              </a>
              <a href="/dashboard" className="text-white hover:text-primary-300 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Панель
              </a>
              <Link
                href="/create"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Create
              </Link>
            </div>
          </div>

          {/* Кнопка подключения кошелька */}
          <div className="hidden md:block">
                            <WalletButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !font-medium" />
          </div>

          {/* Мобильное меню кнопка */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-primary-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              {isMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/10 backdrop-blur-md rounded-lg mt-2">
              <a href="#features" className="text-white hover:text-primary-300 block px-3 py-2 rounded-md text-base font-medium">
                Возможности
              </a>
              <a href="#creators" className="text-white hover:text-primary-300 block px-3 py-2 rounded-md text-base font-medium">
                Авторы
              </a>
              <a href="#pricing" className="text-white hover:text-primary-300 block px-3 py-2 rounded-md text-base font-medium">
                Цены
              </a>
              <a href="/dashboard" className="text-white hover:text-primary-300 block px-3 py-2 rounded-md text-base font-medium">
                Панель
              </a>
              <Link
                href="/create"
                className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Create
              </Link>
                              <div className="pt-2">
                  <WalletButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !font-medium !w-full" />
                </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
} 