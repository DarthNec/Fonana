'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { SafeWalletButton } from '@/components/ui/ssr-safe'
import { WalletIcon, ArrowRightOnRectangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { createPhantomConnectDeepLink } from '@/lib/utils/phantomMobile'
import { detectWalletEnvironment } from '@/lib/auth/solana'


export function MobileWalletConnect() {
  const { connected, connect, disconnect, wallet, select } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [walletEnv, setWalletEnv] = useState<ReturnType<typeof detectWalletEnvironment> | null>(null)

  useEffect(() => {
    // Используем unified detectWalletEnvironment вместо локальных функций
    const env = detectWalletEnvironment()
    setWalletEnv(env)
    
    console.log('[MobileWalletConnect] Wallet environment:', {
      isInWalletBrowser: env.isInWalletBrowser,
      isMobile: env.isMobile,
      hasPhantomProvider: env.hasPhantomProvider
    })
  }, [])

  const handleMobileConnect = async () => {
    if (!walletEnv) {
      console.log('[MobileWalletConnect] Environment not detected yet')
      return
    }

    // ✅ СЦЕНАРИЙ 1: УЖЕ ВНУТРИ Phantom app → Прямое подключение
    if (walletEnv.isInWalletBrowser) {
      console.log('[MobileWalletConnect] Inside Phantom app, using direct connect')
      
      try {
        toast.loading('Connecting to Phantom...', { duration: 2000 })
        
        if ((window as any).solana?.connect) {
          const response = await (window as any).solana.connect()
          console.log('[MobileWalletConnect] Connected:', response.publicKey.toString())
          toast.success('Wallet connected!', { duration: 2000 })
        } else {
          throw new Error('Phantom provider not available')
        }
      } catch (error) {
        console.error('[MobileWalletConnect] Direct connect failed:', error)
        toast.error('Failed to connect wallet', { duration: 3000 })
      }
      return
    }

    // ⚠️ СЦЕНАРИЙ 2: Мобильный браузер БЕЗ Phantom → Deep link
    if (walletEnv.isMobile && !walletEnv.hasPhantomProvider) {
      console.log('[MobileWalletConnect] Mobile without Phantom, opening deep link')
      
      const deeplink = createPhantomConnectDeepLink({
        appUrl: window.location.origin,
        redirectLink: window.location.href,
        cluster: 'mainnet-beta'
      })
      
      toast.loading('Opening Phantom Wallet...', { duration: 3000 })
      
      setTimeout(() => {
        window.location.href = deeplink
      }, 100)
      return
    }

    // 🖥️ СЦЕНАРИЙ 3: Desktop или Phantom установлен → Стандартный modal
    console.log('[MobileWalletConnect] Using standard wallet modal')
    setVisible(true)
  }

  // Если мобильное устройство без Phantom, показываем кастомную кнопку
  if (walletEnv?.isMobile && !walletEnv?.hasPhantomProvider && !connected) {
    return (
      <button
        onClick={handleMobileConnect}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 text-white rounded-xl font-medium transition-all duration-200 hover:opacity-90"
        style={{
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
        }}
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

  // В остальных случаях используем стандартную кнопку с wallet-adapter стилями
  if(!connected) {  
  return(
    <button
      onClick={handleMobileConnect}
      className="w-full flex items-center justify-center wallet-adapter-button"
      style={{
        background: 'rgb(15, 20, 30)',
        border: '1px solid rgba(71, 85, 105, 0.2)',
        borderRadius: '1rem',
        color: 'rgb(248, 250, 252)',
        fontWeight: '600',
        padding: '0.75rem 1rem',
        transition: 'all 0.3s ease',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 'clamp(0.875rem, 4vw, 1rem)' // Адаптивный размер от 14px до 16px
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
        e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.1)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.2)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      Select Wallet
      <div style={{ display: 'none' }}>
        <SafeWalletButton className="w-full flex items-center justify-center gap-3 py-3 px-4 text-white rounded-xl font-medium transition-all duration-200 hover:opacity-90" />
      </div>
    </button>
  )
  }

  if(connected)
  {
    return <SafeWalletButton className="w-full flex items-center justify-center gap-3 py-3 px-4 text-white rounded-xl font-medium transition-all duration-200 hover:opacity-90" />
  }
} 