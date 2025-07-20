/**
 * SSR-Safe UI Components
 * 
 * These components wrap problematic libraries that use React Context
 * and cause "Cannot read properties of null (reading 'useContext')" errors during SSR.
 * 
 * @enterprise-pattern Centralized SSR-Safe Exports
 * @see docs/debug/ssr-usecontext-comprehensive-2025-020/
 */

export { 
  SafeDialog, 
  SafeDialogPanel,
  SafeDialogTitle,
  SafeDialogDescription,
  type SafeDialogProps 
} from './SafeDialog'

export { 
  SafeTransition,
  SafeTransitionChild,
  SafeTransitionRoot,
  type SafeTransitionProps,
  type SafeTransitionChildProps
} from './SafeTransition'

export {
  SafeWalletButton,
  type SafeWalletButtonProps
} from './SafeWalletButton'

// Hook exports are in lib/hooks/
// export { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal' 