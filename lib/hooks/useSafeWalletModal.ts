'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

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
    // 🔹 Проверяем наличие Phantom или другого Solana кошелька
    const hasWallet =
      (window as any).solana?.isPhantom ||
      (window as any).solflare ||
      (window as any).backpack;
    console.log('[useSafeWalletModal] hasWallet', hasWallet);
    if (!hasWallet) {
      console.warn('[useSafeWalletModal] No wallet found in browser.');
      
      // Устанавливаем специальный handler, который откроет страницу установки при попытке подключения
      const noWalletHandler: WalletModalState = {
        visible: false,
        setVisible: (visible: boolean) => {
          if (visible) {
            // При попытке открыть модал подключения - показываем уведомление и открываем страницу установки
            
            toast.error('Кошелёк не найден. Установите Phantom для подключения.', {
              duration: 5000,
              position: 'top-right',
            });
            
            // Открываем страницу установки (из клика по кнопке - popup не блокируется)
            window.open('https://phantom.app/download', '_blank', 'noopener,noreferrer');
          }
        },
      };
      
      setModalState(noWalletHandler);
      return;
    }
  
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
  }, []);

  return modalState
}

// For backwards compatibility
export default useSafeWalletModal 