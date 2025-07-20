'use client'

import dynamic from 'next/dynamic'
import React from 'react'
import type { TransitionProps, TransitionChildProps } from '@headlessui/react'

/**
 * SSR-safe wrapper for @headlessui/react Transition component
 * Prevents "Cannot read properties of null (reading 'useContext')" errors during SSR
 * 
 * @enterprise-pattern Safe Dynamic Import
 * @see docs/debug/ssr-usecontext-comprehensive-2025-020/
 */

// Dynamic import with SSR disabled
const DynamicTransition = dynamic<TransitionProps<any>>(
  () => import('@headlessui/react').then(mod => mod.Transition),
  { 
    ssr: false,
    // No loading UI for transitions - they should be invisible until ready
  }
)

const DynamicTransitionChild = dynamic<TransitionChildProps<any>>(
  () => import('@headlessui/react').then(mod => mod.Transition.Child),
  { ssr: false }
)

// Type-safe components matching Transition's interface
export type SafeTransitionProps<TTag extends React.ElementType = 'div'> = TransitionProps<TTag>
export type SafeTransitionChildProps<TTag extends React.ElementType = 'div'> = TransitionChildProps<TTag>

export function SafeTransition<TTag extends React.ElementType = 'div'>(
  props: SafeTransitionProps<TTag>
) {
  return <DynamicTransition {...props} />
}

export function SafeTransitionChild<TTag extends React.ElementType = 'div'>(
  props: SafeTransitionChildProps<TTag>
) {
  return <DynamicTransitionChild {...props} />
}

// Static properties for nested usage
SafeTransition.Child = SafeTransitionChild

// Root export (for Transition.Root pattern)
export const SafeTransitionRoot = SafeTransition

// For backwards compatibility
export default SafeTransition 