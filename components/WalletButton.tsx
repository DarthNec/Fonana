'use client'

import { useEffect, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'
import { UserIcon } from '@heroicons/react/24/outline'

export function WalletButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const { connected } = useWallet()
  const { user, isLoading } = useUser()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className={`${className} !bg-primary-600 hover:!bg-primary-700 !rounded-lg !font-medium`}>
        Connect Wallet
      </button>
    )
  }

  // Если подключен и есть пользователь, показываем профиль
  if (connected && user && !isLoading) {
    return (
      <div className="flex items-center gap-3">
        {/* Аватар и имя */}
        <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar.startsWith('/avatars/') ? `https://fonana.me${user.avatar}` : user.avatar}
                alt={user.fullName || user.nickname || 'User'}
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  // При ошибке загрузки показываем иконку
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-medium">
              {user.fullName || user.nickname || 'Пользователь'}
            </p>
            <p className="text-slate-400 text-xs">
              @{user.nickname || 'user'}
            </p>
          </div>
        </div>
        
        {/* Кнопка кошелька */}
        <WalletMultiButton className={className} />
      </div>
    )
  }

  return (
    <WalletMultiButton className={className} />
  )
} 