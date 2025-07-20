'use client'

import dynamic from 'next/dynamic'
import React from 'react'
import type { DialogProps } from '@headlessui/react'

/**
 * SSR-safe wrapper for @headlessui/react Dialog component
 * Prevents "Cannot read properties of null (reading 'useContext')" errors during SSR
 * 
 * @enterprise-pattern Safe Dynamic Import
 * @see docs/debug/ssr-usecontext-comprehensive-2025-020/
 */

// Loading fallback that matches Dialog overlay behavior
const DialogLoadingFallback = () => (
  <div className="fixed inset-0 z-50">
    {/* Overlay */}
    <div className="fixed inset-0 bg-black/50 animate-pulse" />
    
    {/* Centered loading indicator */}
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    </div>
  </div>
)

// Dynamic import with SSR disabled
const DynamicDialog = dynamic<DialogProps>(
  () => import('@headlessui/react').then(mod => mod.Dialog),
  { 
    ssr: false,
    loading: () => <DialogLoadingFallback />
  }
)

// Type-safe component matching Dialog's interface
export type SafeDialogProps = DialogProps

export const SafeDialog: React.FC<SafeDialogProps> = (props) => {
  return <DynamicDialog {...props} />
}

// Export Fragment and other Dialog static components
export const SafeDialogFragment = dynamic(
  () => import('@headlessui/react').then(mod => mod.Dialog.Panel),
  { ssr: false }
)

export const SafeDialogPanel = SafeDialogFragment
export const SafeDialogTitle = dynamic(
  () => import('@headlessui/react').then(mod => mod.Dialog.Title),
  { ssr: false }
)
export const SafeDialogDescription = dynamic(
  () => import('@headlessui/react').then(mod => mod.Dialog.Description),
  { ssr: false }
)

// For backwards compatibility
export default SafeDialog 