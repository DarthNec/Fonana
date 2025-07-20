'use client'

import { useEffect, useState } from 'react'

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
    // Only load on client side
    if (typeof window === 'undefined') {
      return
    }

    // Dynamic import to prevent SSR issues
    import('@solana/wallet-adapter-react-ui').then(module => {
      // This will need to be called within a component that has WalletModalProvider
      try {
        // We can't directly call the hook here, so we'll provide a manual implementation
        // that interacts with the modal through the DOM
        const modalHandler: WalletModalState = {
          visible: false,
          setVisible: (visible: boolean) => {
            // Trigger wallet modal through button click
            const walletButton = document.querySelector('.wallet-adapter-button-trigger') as HTMLButtonElement
            if (walletButton && visible) {
              walletButton.click()
            }
          }
        }
        
        setModalState(modalHandler)
        setIsLoaded(true)
      } catch (error) {
        console.error('[useSafeWalletModal] Error loading wallet modal:', error)
      }
    })
  }, [])

  return modalState
}

// For backwards compatibility
export default useSafeWalletModal 