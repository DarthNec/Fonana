'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

// Проверка мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent)
  
  return isMobile || isTablet
}

// Проверка, установлен ли Phantom
const isPhantomInstalled = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window.solana && window.solana.isPhantom)
}

// Получение deeplink для Phantom
const getPhantomDeeplink = () => {
  if (typeof window === 'undefined') return ''
  
  // Получаем текущий URL для возврата после подключения
  const currentUrl = encodeURIComponent(window.location.href)
  const appUrl = encodeURIComponent(window.location.origin)
  
  // Phantom универсальная ссылка
  return `https://phantom.app/ul/browse/${appUrl}?ref=${currentUrl}`
}

interface MobileWalletConnectProps {
  className?: string
  inMenu?: boolean
}

export function MobileWalletConnect({ className, inMenu }: MobileWalletConnectProps) {
  const { connected, connect, disconnect, wallet, select } = useWallet()
  const [isMobile, setIsMobile] = useState(false)
  const [hasPhantom, setHasPhantom] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
    setHasPhantom(isPhantomInstalled())
  }, [])

  const handleMobileConnect = () => {
    if (isMobile && !hasPhantom) {
      // На мобильном устройстве без установленного Phantom
      const deeplink = getPhantomDeeplink()
      
      // Показываем сообщение
      toast.loading('Opening Phantom Wallet...', { duration: 3000 })
      
      // Небольшая задержка перед переходом
      setTimeout(() => {
        window.location.href = deeplink
      }, 100)
    } else {
      // На десктопе или если Phantom установлен - используем стандартное поведение
      // Кнопка сама обработает клик
    }
  }

  // Если мобильное устройство без Phantom, показываем кастомную кнопку
  if (isMobile && !hasPhantom && !connected) {
    return (
      <button
        onClick={handleMobileConnect}
        className={className || (inMenu ? 
          "w-full flex items-center justify-center gap-3 py-3 px-4 text-white rounded-xl font-medium transition-all duration-200 hover:opacity-90" :
          "wallet-adapter-button wallet-adapter-button-trigger"
        )}
        style={!className && !inMenu ? {
          backgroundColor: 'rgb(78, 54, 204)',
          color: 'white',
          padding: '0 24px',
          height: '48px',
          fontSize: '16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.2s'
        } : undefined}
      >
        {/* Phantom Logo */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M19.9 7.6C19.9 3.4 16.5 0 12.3 0C7.1 0 3 4.1 3 9.3C3 10.2 3.1 11 3.4 11.8C3.4 11.9 3.4 11.9 3.5 12C3.8 12.9 4.3 13.7 4.9 14.4C6.3 16.4 7.9 17.8 9.4 19.1C10.8 20.3 12.1 21.4 13.1 22.5C13.7 23.2 14.8 23.2 15.4 22.5C16.1 21.7 17 20.8 18 19.9C20 18 22.3 15.8 23.6 13C23.9 12.3 24 11.5 24 10.7C24 9.3 22.3 7.6 19.9 7.6Z" fill="white"/>
          <path d="M10.5 11.5C11.3284 11.5 12 10.8284 12 10C12 9.17157 11.3284 8.5 10.5 8.5C9.67157 8.5 9 9.17157 9 10C9 10.8284 9.67157 11.5 10.5 11.5Z" fill="rgb(78, 54, 204)"/>
          <path d="M16.5 11.5C17.3284 11.5 18 10.8284 18 10C18 9.17157 17.3284 8.5 16.5 8.5C15.6716 8.5 15 9.17157 15 10C15 10.8284 15.6716 11.5 16.5 11.5Z" fill="rgb(78, 54, 204)"/>
        </svg>
        <span>Connect Wallet</span>
      </button>
    )
  }

  // В остальных случаях используем стандартную кнопку
  return <WalletMultiButton className={className} />
} 