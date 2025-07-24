import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { PerformanceTracker } from '@/lib/monitoring/performance'

// 📊 ENTERPRISE REACT QUERY HOOK
// Enhanced useQuery with performance monitoring, structured logging, and error handling

interface EnterpriseQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>
  enablePerformanceTracking?: boolean
  enableStructuredLogging?: boolean
  context?: string // For logging context
}

interface EnterpriseQueryResult<T> extends UseQueryResult<T> {
  performanceStats?: {
    lastDuration?: number
    averageDuration?: number
    slowCallsCount?: number
  }
}

export function useEnterpriseQuery<T>(
  options: EnterpriseQueryOptions<T>
): EnterpriseQueryResult<T> {
  const {
    queryFn,
    enablePerformanceTracking = true,
    enableStructuredLogging = true,
    context = 'unknown',
    ...restOptions
  } = options
  
  // Enhanced query function with enterprise features
  const enhancedQueryFn = async (): Promise<T> => {
    const queryKey = restOptions.queryKey || ['unknown']
    const operation = `query-${Array.isArray(queryKey) ? queryKey.join('-') : 'unknown'}`
    
    // Start performance tracking
    const endTimer = enablePerformanceTracking 
      ? PerformanceTracker.startTimer(operation, {
          queryKey,
          context,
          enabled: restOptions.enabled !== false
        })
      : null
    
    // Structured logging
    if (enableStructuredLogging) {
      console.info(`[ENTERPRISE QUERY START] ${operation}`, {
        queryKey,
        context,
        timestamp: new Date().toISOString(),
        enabled: restOptions.enabled !== false
      })
    }
    
    try {
      const result = await queryFn()
      
      // Success logging
      if (enableStructuredLogging) {
        console.info(`[ENTERPRISE QUERY SUCCESS] ${operation}`, {
          queryKey,
          context,
          resultType: typeof result,
          isArray: Array.isArray(result),
          arrayLength: Array.isArray(result) ? result.length : undefined,
          timestamp: new Date().toISOString()
        })
      }
      
      return result
      
    } catch (error) {
      // Error logging with structured format
      if (enableStructuredLogging) {
        console.error(`[ENTERPRISE QUERY ERROR] ${operation}`, {
          queryKey,
          context,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'UnknownError',
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : undefined
        })
      }
      
      throw error
      
    } finally {
      // End performance tracking
      if (endTimer) {
        endTimer()
      }
    }
  }
  
  // Use React Query with enhanced function
  const queryResult = useQuery({
    ...restOptions,
    queryFn: enhancedQueryFn,
    // Enterprise-grade retry configuration
    retry: restOptions.retry ?? 3,
    retryDelay: restOptions.retryDelay ?? ((attemptIndex) => 
      Math.min(1000 * 2 ** attemptIndex, 30000)
    ),
    // Default stale time for better performance
    staleTime: restOptions.staleTime ?? (5 * 60 * 1000),
    // Error handling
    onError: (error) => {
      // Call original onError if provided
      restOptions.onError?.(error)
      
      // Enterprise error tracking
      if (enableStructuredLogging) {
        const queryKey = restOptions.queryKey || ['unknown']
        console.error(`[ENTERPRISE QUERY FINAL ERROR] ${Array.isArray(queryKey) ? queryKey.join('-') : 'unknown'}`, {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'UnknownError'
          },
          queryKey,
          context,
          retries: restOptions.retry ?? 3,
          timestamp: new Date().toISOString()
        })
      }
    },
    onSuccess: (data) => {
      // Call original onSuccess if provided
      restOptions.onSuccess?.(data)
      
      // Enterprise success metrics
      if (enablePerformanceTracking && enableStructuredLogging) {
        const queryKey = restOptions.queryKey || ['unknown']
        const operation = `query-${Array.isArray(queryKey) ? queryKey.join('-') : 'unknown'}`
        const stats = PerformanceTracker.getStats(operation)
        
        if (stats && stats.count > 1) {
          console.info(`[ENTERPRISE QUERY METRICS] ${operation}`, {
            averageDuration: `${stats.avg.toFixed(2)}ms`,
            maxDuration: `${stats.max.toFixed(2)}ms`,
            callCount: stats.count,
            slowCallsCount: stats.slowOperations,
            p95Duration: `${stats.p95.toFixed(2)}ms`
          })
        }
      }
    }
  })
  
  // Add performance stats to result
  const enhancedResult: EnterpriseQueryResult<T> = {
    ...queryResult,
    performanceStats: enablePerformanceTracking ? (() => {
      const queryKey = restOptions.queryKey || ['unknown']
      const operation = `query-${Array.isArray(queryKey) ? queryKey.join('-') : 'unknown'}`
      const stats = PerformanceTracker.getStats(operation)
      
      if (!stats) return undefined
      
      return {
        lastDuration: stats.count > 0 ? PerformanceTracker.getRecentSlowOperations(1)[0]?.duration : undefined,
        averageDuration: stats.avg,
        slowCallsCount: stats.slowOperations
      }
    })() : undefined
  }
  
  return enhancedResult
}

// 📊 Convenience hooks for common patterns

// Hook for data fetching with automatic error handling
export function useEnterpriseFetch<T>(
  url: string,
  options?: Omit<EnterpriseQueryOptions<T>, 'queryFn' | 'queryKey'> & {
    fetchOptions?: RequestInit
  }
) {
  return useEnterpriseQuery<T>({
    queryKey: ['fetch', url],
    queryFn: async () => {
      const response = await fetch(url, options?.fetchOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response.json()
    },
    context: `fetch-${url}`,
    ...options
  })
}

// Hook for API calls with validation
export function useEnterpriseApi<T>(
  endpoint: string,
  options?: Omit<EnterpriseQueryOptions<T>, 'queryFn' | 'queryKey'> & {
    method?: string
    body?: any
    headers?: Record<string, string>
  }
) {
  return useEnterpriseQuery<T>({
    queryKey: ['api', endpoint, options?.method || 'GET'],
    queryFn: async () => {
      const response = await fetch(`/api/${endpoint.replace(/^\//, '')}`, {
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        body: options?.body ? JSON.stringify(options.body) : undefined
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API Error: ${response.status}`)
      }
      
      return response.json()
    },
    context: `api-${endpoint}`,
    ...options
  })
}

// 📊 Performance debugging helpers
export const EnterpriseQueryHelpers = {
  // Get performance stats for all queries
  getAllQueryStats: () => PerformanceTracker.getAllStats(),
  
  // Get slow queries in last N minutes
  getSlowQueries: (minutes: number = 5) => 
    PerformanceTracker.getRecentSlowOperations(minutes)
      .filter(op => op.operation.startsWith('query-')),
  
  // Clear all performance data
  clearStats: () => PerformanceTracker.clearMetrics(),
  
  // Set custom slow threshold
  setSlowThreshold: (ms: number) => PerformanceTracker.setSlowThreshold(ms),
  
  // Generate performance report
  generateReport: () => PerformanceTracker.logPerformanceReport()
}

// 📊 Add to window for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).enterpriseQueryHelpers = EnterpriseQueryHelpers
  console.info('[ENTERPRISE QUERY] Debugging helpers available at window.enterpriseQueryHelpers')
} 