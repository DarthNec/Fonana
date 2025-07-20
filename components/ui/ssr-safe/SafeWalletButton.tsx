'use client'

import dynamic from 'next/dynamic'
import type { WalletMultiButtonProps } from '@solana/wallet-adapter-react-ui'

/**
 * SSR-safe wrapper for @solana/wallet-adapter-react-ui WalletMultiButton
 * Prevents "Cannot read properties of null (reading 'useContext')" errors during SSR
 * 
 * @enterprise-pattern Safe Dynamic Import
 * @see docs/debug/ssr-usecontext-comprehensive-2025-020/
 */

// Loading fallback that matches WalletMultiButton style
const WalletButtonLoading = () => (
  <button 
    className="wallet-adapter-button wallet-adapter-button-trigger"
    style={{
      backgroundColor: 'rgb(90, 40, 154)',
      color: 'white',
      cursor: 'not-allowed',
      opacity: 0.8,
      minWidth: '180px'
    }}
    disabled
  >
    <span className="wallet-adapter-button-start-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path 
          d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3Z" 
          fill="currentColor" 
          opacity="0.5"
        />
      </svg>
    </span>
    Loading...
  </button>
)

// Dynamic import with SSR disabled
const DynamicWalletButton = dynamic<WalletMultiButtonProps>(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { 
    ssr: false,
    loading: () => <WalletButtonLoading />
  }
)

// Type-safe component
export type SafeWalletButtonProps = WalletMultiButtonProps

export const SafeWalletButton: React.FC<SafeWalletButtonProps> = (props) => {
  return <DynamicWalletButton {...props} />
}

// For backwards compatibility
export default SafeWalletButton 