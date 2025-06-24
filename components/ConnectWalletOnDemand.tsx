'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAuth } from '@/lib/hooks/useAuth'
import { detectWalletEnvironment } from '@/lib/auth/solana'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { WalletIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface ConnectWalletOnDemandProps {
  onConnect?: () => void
  message?: string
}

export function ConnectWalletOnDemand({ 
  onConnect, 
  message = 'Для выполнения этого действия необходимо подключить кошелек' 
}: ConnectWalletOnDemandProps) {
  const { connected, connect } = useWallet()
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const handleConnect = async () => {
    const env = detectWalletEnvironment()
    
    // Показываем подсказку в зависимости от окружения
    if (env.isInWalletBrowser) {
      // Во встроенном браузере кошелька
      toast('Используйте встроенный кошелек браузера', {
        icon: '💡',
        duration: 3000
      })
    } else if (env.isMobile && !env.isPhantom) {
      // На мобильном без установленного кошелька
      setShowHint(true)
    }
    
    setIsOpen(true)
  }

  if (connected) {
    onConnect?.()
    return null
  }

  return (
    <>
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
      >
        <WalletIcon className="w-5 h-5" />
        Подключить кошелек
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Подключение кошелька
            </Dialog.Title>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {message}
              </p>
              
              {isAuthenticated && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <InformationCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Вы уже авторизованы. Кошелек нужен только для проведения транзакций.
                  </p>
                </div>
              )}
              
              {showHint && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Для работы на мобильном устройстве рекомендуем:
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    <li>Установить Phantom или другой кошелек</li>
                    <li>Открыть сайт во встроенном браузере кошелька</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              <WalletMultiButton className="!w-full !justify-center" />
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
} 