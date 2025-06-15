'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'

export default function PlatformWalletWarning() {
  const { publicKey, connected } = useWallet()
  const [dismissed, setDismissed] = useState(false)
  
  if (!connected || !publicKey || dismissed) {
    return null
  }
  
  const isPlatformWallet = publicKey.toBase58() === PLATFORM_WALLET
  
  if (!isPlatformWallet) {
    return null
  }
  
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-red-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 mr-3" />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Внимание: Вы используете кошелек платформы!
            </h3>
            <p className="text-sm mb-3">
              Вы подключены с кошельком платформы Fonana. Для покупки контента и подписок необходимо использовать ваш личный кошелек.
            </p>
            <div className="bg-red-700 rounded p-2 mb-3">
              <p className="text-xs font-mono break-all">
                Текущий кошелек: {publicKey.toBase58()}
              </p>
            </div>
            <p className="text-sm font-bold">
              Пожалуйста, переключитесь на личный кошелек в Phantom или другом кошельке.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="ml-3 p-1 hover:bg-red-700 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 