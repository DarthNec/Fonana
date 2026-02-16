'use client'

import React, { useState } from 'react'
import { XMarkIcon, WalletIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useAppStore } from '@/lib/store/appStore'
import { useWalletStore } from '@/lib/store/walletStore'
import { jwtManager } from '@/lib/utils/jwt'
import toast from 'react-hot-toast'

interface ConnectWalletPopupProps {
  isOpen: boolean
  onClose: () => void
  currentWallet: string // TG_ or FK_ wallet
  userType: 'telegram' | 'guest'
}

export default function ConnectWalletPopup({ 
  isOpen, 
  onClose, 
  currentWallet,
  userType
}: ConnectWalletPopupProps) {
  const { connected, publicKey } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const [isConnecting, setIsConnecting] = useState(false)
  const user = useAppStore(state => state.user)
  const setUser = useAppStore(state => state.setUser)

  if (!isOpen) return null

  // Обработчик подключения через Phantom modal
  const handleConnectWallet = async () => {
    setIsConnecting(true)

    try {
      console.log('🔗 [CONNECT WALLET] Opening Phantom modal...')
      
      // Открываем стандартное модальное окно Phantom
      setVisible(true)
      
      // Закрываем наш popup
      onClose()
      
      // Слушаем изменение состояния кошелька
      const checkConnection = setInterval(async () => {
        const walletState = useWalletStore.getState()
        const currentPublicKey = walletState.publicKey
        
        if (walletState.connected && currentPublicKey) {
          clearInterval(checkConnection)
          
          console.log('🔗 [CONNECT WALLET] Wallet connected, publicKey:', currentPublicKey.toBase58())
          
          const newWallet = currentPublicKey.toBase58()
          
          // Отправляем запрос на сервер для обновления кошелька
          try {
            console.log('🔗 [CONNECT WALLET] Sending request to update wallet...')
            const response = await fetch('/api/wallet/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                oldWallet: currentWallet,
                newWallet: newWallet
              })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Failed to connect wallet')
            }

            console.log('🔗 [CONNECT WALLET] Wallet updated on server:', data.user)

            // Обновляем localStorage
            localStorage.setItem('fonana_user_wallet', newWallet)
            
            // Убираем маркеры Telegram или Guest в зависимости от типа пользователя
            if (userType === 'telegram') {
              localStorage.removeItem('fonana_telegram_auth')
            } else if (userType === 'guest') {
              localStorage.removeItem('fonana_guest_auth')
              localStorage.removeItem('fonana_device_id')
            }
            
            console.log('🔗 [CONNECT WALLET] Updated localStorage')

            // Сохраняем новый JWT token
            if (data.token) {
              await jwtManager.saveToken(data.token)
              console.log('🔗 [CONNECT WALLET] JWT token saved')
            }

            // Обновляем пользователя в appStore
            if (user) {
              setUser({
                ...user,
                wallet: newWallet,
                solanaWallet: newWallet
              })
            }

            toast.success('Кошелек успешно подключен! Теперь доступны все финансовые функции.')
            
            // Перезагружаем через небольшую задержку
            setTimeout(() => {
              window.location.reload()
            }, 1000)

          } catch (error) {
            console.error('🔗 [CONNECT WALLET] Error updating wallet:', error)
            toast.error(
              error instanceof Error 
                ? `Ошибка подключения: ${error.message}` 
                : 'Ошибка подключения кошелька'
            )
          } finally {
            setIsConnecting(false)
          }
        }
      }, 500)
      
      // Таймаут на 60 секунд
      setTimeout(() => {
        clearInterval(checkConnection)
        setIsConnecting(false)
      }, 60000)

    } catch (error) {
      console.error('🔗 [CONNECT WALLET] Error:', error)
      toast.error(
        error instanceof Error 
          ? `Ошибка подключения: ${error.message}` 
          : 'Ошибка подключения кошелька'
      )
      setIsConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isConnecting}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <WalletIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            Connect your wallet
          </h2>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {userType === 'guest' 
              ? 'Connect your Solana wallet to access financial functions: tips, subscriptions, purchases and creating paid content.'
              : 'To use financial functions of the platform (tips, subscriptions, purchases) you need to connect your Solana wallet.'
            }
          </p>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Safe</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userType === 'guest' 
                    ? 'Your guest account will be linked to your wallet'
                    : 'Your Telegram account will remain linked'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ArrowPathIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Full access</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userType === 'guest'
                    ? 'Send tips, create paid content'
                    : 'Send tips, subscribe to content'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Current Wallet Info */}
          <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current identifier</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
              {currentWallet}
            </p>
          </div>

          {/* Connect Button - Точно такая же как в LogInMethodPopup */}
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full">
              <svg 
                className="w-6 h-6" 
                viewBox="0 0 128 128" 
                fill="none"
              >
                <path 
                  d="M104.017 38.5826C97.5574 30.8365 87.9421 26.2859 77.8029 26.2859C75.0558 26.2859 52.8676 26.3546 40.9637 38.2585C29.0599 50.1624 29.1286 72.3505 29.1286 75.0977C29.1286 85.2369 33.6792 94.8522 41.4253 101.312C49.1714 107.771 59.2733 111.714 69.4499 111.714C72.1971 111.714 94.3852 111.646 106.289 99.7418C118.193 87.8379 118.124 65.6498 118.124 62.9026C118.124 52.7633 113.573 43.148 106.289 36.6886C105.826 36.2632 104.48 38.1199 104.017 38.5826ZM54.4189 56.139C56.0789 54.479 58.2616 53.5736 60.5443 53.5736C62.827 53.5736 65.0097 54.479 66.6697 56.139C68.3297 57.799 69.2351 59.9817 69.2351 62.2644C69.2351 64.5471 68.3297 66.7298 66.6697 68.3898C65.0097 70.0498 62.827 70.9552 60.5443 70.9552C58.2616 70.9552 56.0789 70.0498 54.4189 68.3898C52.7589 66.7298 51.8535 64.5471 51.8535 62.2644C51.8535 59.9817 52.7589 57.799 54.4189 56.139ZM85.1871 68.3898C83.5271 70.0498 81.3444 70.9552 79.0617 70.9552C76.779 70.9552 74.5963 70.0498 72.9363 68.3898C71.2763 66.7298 70.3709 64.5471 70.3709 62.2644C70.3709 59.9817 71.2763 57.799 72.9363 56.139C74.5963 54.479 76.779 53.5736 79.0617 53.5736C81.3444 53.5736 83.5271 54.479 85.1871 56.139C86.8471 57.799 87.7525 59.9817 87.7525 62.2644C87.7525 64.5471 86.8471 66.7298 85.1871 68.3898ZM52.9589 87.0626C51.8535 87.0626 50.9481 86.1572 50.9481 85.0518C50.9481 83.9464 51.8535 83.041 52.9589 83.041H86.5844C87.6898 83.041 88.5952 83.9464 88.5952 85.0518C88.5952 86.1572 87.6898 87.0626 86.5844 87.0626H52.9589Z" 
                  fill="url(#phantom-gradient)"
                />
                <defs>
                  <linearGradient id="phantom-gradient" x1="29.1286" y1="26.2859" x2="118.124" y2="111.714" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9945FF"/>
                    <stop offset="1" stopColor="#14F195"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex-1 text-left">
              {isConnecting ? (
                <>
                  <div className="font-bold text-base flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Подключение...
                  </div>
                  <div className="text-xs text-purple-100">Waiting for confirmation</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-base">Connect Phantom</div>
                  <div className="text-xs text-purple-100">Open wallet to connect</div>
                </>
              )}
            </div>
          </button>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="w-full mt-3 py-3 px-6 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
