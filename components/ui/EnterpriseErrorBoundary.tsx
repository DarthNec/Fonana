'use client'

import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { EnterpriseError } from './EnterpriseError'

interface EnterpriseErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<any>
  context: string
  queryKey?: string[]
}

interface EnrichedErrorContext {
  component: string
  userId?: string
  userAgent?: string
  url?: string
  timestamp: string
  componentStack?: string
  buildVersion?: string
  error: {
    message: string
    stack?: string
    name: string
  }
}

export const EnterpriseErrorBoundary: React.FC<EnterpriseErrorBoundaryProps> = ({
  children,
  fallback: Fallback,
  context,
  queryKey
}) => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Create enriched error context
    const enrichedContext: EnrichedErrorContext = {
      component: context,
      userId: 'anonymous', // TODO: Get from user context when available
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'development',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }
    
    // Enterprise-grade structured logging
    console.error('[ENTERPRISE ERROR BOUNDARY]', {
      ...enrichedContext,
      severity: 'CRITICAL',
      category: 'component_crash',
      queryKey
    })
    
    // Performance impact tracking
    const performanceData = {
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : undefined,
      navigation: performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : undefined
    }
    
    if (performanceData.memory || performanceData.navigation) {
      console.warn('[PERFORMANCE CONTEXT]', performanceData)
    }
    
    // Error frequency tracking
    const errorKey = `error_${context}_${error.name}`
    const errorCount = parseInt(sessionStorage.getItem(errorKey) || '0') + 1
    sessionStorage.setItem(errorKey, errorCount.toString())
    
    if (errorCount > 3) {
      console.error(`[CRITICAL REPEATED ERROR] ${context} has crashed ${errorCount} times this session`)
      
      // Clear error count after warning
      if (errorCount > 5) {
        sessionStorage.removeItem(errorKey)
        console.warn(`[ERROR RESET] Clearing error count for ${context} after 5 crashes`)
      }
    }
    
    // Future: Send to monitoring service
    // Example structure for Sentry/DataDog integration:
    /*
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          errorBoundary: enrichedContext,
          performance: performanceData
        },
        tags: {
          component: context,
          errorCount: errorCount.toString()
        },
        extra: {
          queryKey,
          componentStack: errorInfo.componentStack
        }
      })
    }
    */
  }
  
  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => {
    // Use custom fallback or default EnterpriseError
    if (Fallback) {
      return <Fallback error={error} resetErrorBoundary={resetErrorBoundary} />
    }
    
    return (
      <EnterpriseError 
        error={error} 
        context={context}
        onRetry={resetErrorBoundary}
        queryKey={queryKey}
      />
    )
  }
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Log recovery attempt
        console.info(`[ERROR RECOVERY] ${context}: User initiated error boundary reset`)
        
        // Clear any local error state if needed
        // This is where you might want to clear React Query cache or reset Zustand state
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Convenience wrapper for common use cases
export const withEnterpriseErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  context: string,
  queryKey?: string[]
) => {
  const WrappedComponent = (props: P) => (
    <EnterpriseErrorBoundary context={context} queryKey={queryKey}>
      <Component {...props} />
    </EnterpriseErrorBoundary>
  )
  
  WrappedComponent.displayName = `withEnterpriseErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
} 