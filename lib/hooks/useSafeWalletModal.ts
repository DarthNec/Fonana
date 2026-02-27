'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { isMobileDevice, createPhantomConnectDeepLink } from '@/lib/utils/phantomMobile'
import { detectWalletEnvironment } from '@/lib/auth/solana'

/**
 * SSR-safe replacement for useWalletModal from @solana/wallet-adapter-react-ui
 * Prevents "Cannot read properties of null (reading 'useContext')" errors during SSR
 * 
 * @enterprise-pattern Safe Dynamic Hook
 * @see docs/debug/ssr-usecontext-comprehensive-2025-020/
 */

interface WalletModalState {
  visible: boolean
  setVisible: (visible: boolean) => void
}

// Default state for SSR and loading
const defaultModalState: WalletModalState = {
  visible: false,
  setVisible: () => {
    console.warn('[useSafeWalletModal] setVisible called before modal loaded')
  }
}

export function useSafeWalletModal(): WalletModalState {
  const [modalState, setModalState] = useState<WalletModalState>(defaultModalState)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 🔹 ДЕТЕКТ ОКРУЖЕНИЯ: Проверяем, где открыт сайт
    const env = detectWalletEnvironment()
    console.log('[useSafeWalletModal] Environment detected:', {
      isInWalletBrowser: env.isInWalletBrowser,
      isMobile: env.isMobile,
      hasPhantomProvider: env.hasPhantomProvider
    })
    
    // ✅ ПРИОРИТЕТ 1: Проверяем наличие Phantom или другого Solana кошелька
    // Это работает И на desktop, И в Phantom in-app browser!
    const hasWallet =
      (window as any).solana?.isPhantom ||
      (window as any).solflare ||
      (window as any).backpack;
    
    console.log('[useSafeWalletModal] hasWallet check:', {
      hasWallet,
      isInWalletBrowser: env.isInWalletBrowser,
      isMobile: env.isMobile
    })
    
    if (hasWallet) {
      // ✅ ЕСТЬ КОШЕЛЁК → Используем wallet adapter
      // (работает на desktop И в Phantom in-app browser!)
      console.log('[useSafeWalletModal] Wallet found, using wallet adapter')
      
      // 🔹 Динамически подключаем wallet-adapter UI
      import('@solana/wallet-adapter-react-ui')
        .then((module) => {
          try {
            const modalHandler: WalletModalState = {
              visible: false,
              setVisible: (visible: boolean) => {
                const walletButton = document.querySelector(
                  '.wallet-adapter-button-trigger'
                ) as HTMLButtonElement;
    
                if (walletButton && visible) {
                  walletButton.click();
                } else if (!walletButton && visible) {
                  console.error('Wallet button not found.');
                }
              },
            };
    
            setModalState(modalHandler);
            setIsLoaded(true);
          } catch (error) {
            console.error('[useSafeWalletModal] Error loading wallet modal:', error);
          }
        })
        .catch((err) => {
          console.error('[useSafeWalletModal] Failed to import wallet module:', err);
        });
      
      return
    }
    
    // ⚠️ ПРИОРИТЕТ 2: НЕТ КОШЕЛЬКА → Проверяем мобильный для deep link
    if (env.isMobile) {
      console.log('[useSafeWalletModal] Mobile device without wallet, using deep link')
      
      const mobileHandler: WalletModalState = {
        visible: false,
        setVisible: (visible: boolean) => {
          if (visible) {
            console.log('[useSafeWalletModal] Opening Phantom via deep link...')
            
            // Создаем правильный deep link для подключения
            const deepLink = createPhantomConnectDeepLink({
              appUrl: window.location.origin,
              redirectLink: window.location.href,
              cluster: 'mainnet-beta'
            })
            
            toast.loading('Opening Phantom Wallet...', { duration: 3000 })
            
            // Небольшая задержка перед переходом
            setTimeout(() => {
              window.location.href = deepLink
            }, 100)
          }
        }
      }
      
      setModalState(mobileHandler)
      return
    }
    
    // 🚫 ПРИОРИТЕТ 3: Desktop БЕЗ кошелька → Показываем install page
    console.warn('[useSafeWalletModal] No wallet found on desktop browser.')
    
    const noWalletHandler: WalletModalState = {
      visible: false,
      setVisible: (visible: boolean) => {
        if (visible) {
          toast.error('Wallet not found. Install Phantom to connect.', {
            duration: 5000,
            position: 'top-right',
          });
          
          // Открываем страницу установки
          window.open('https://phantom.app/download', '_blank', 'noopener,noreferrer');
        }
      },
    };
    
    setModalState(noWalletHandler);
  }, []);

  return modalState
}

// For backwards compatibility
export default useSafeWalletModal