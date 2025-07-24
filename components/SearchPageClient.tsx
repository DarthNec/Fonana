'use client'

import { useState, useDeferredValue, useMemo } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { SearchQuerySchema, safeValidate } from '@/lib/validation/schemas'
import { EnterpriseErrorBoundary } from '@/components/ui/EnterpriseErrorBoundary'
import { EnterpriseError } from '@/components/ui/EnterpriseError'
import { z } from 'zod'

function SearchPageClientInner() {
  const [query, setQuery] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // 🔥 M7 PHASE 3: React 18 useDeferredValue for search optimization
  const deferredQuery = useDeferredValue(query)

  // 🔒 ENTERPRISE VALIDATION: Validate search input
  const validatedQuery = useMemo(() => {
    if (!deferredQuery) return null
    
    try {
      const result = SearchQuerySchema.parse({ 
        query: deferredQuery,
        page: 1,
        limit: 20 
      })
      setValidationError(null)
      console.info('[ENTERPRISE VALIDATION] Search query validated:', result)
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Invalid search query'
        setValidationError(errorMessage)
        console.warn('[ENTERPRISE VALIDATION] Search validation failed:', errorMessage)
      }
      return null
    }
  }, [deferredQuery])

  // 🔒 ENTERPRISE SEARCH API: Only search with valid queries
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['search', validatedQuery],
    queryFn: async () => {
      if (!validatedQuery) return []
      
      console.info('[ENTERPRISE QUERY] Executing search:', validatedQuery)
      
      // Use URLSearchParams for safe query string construction
      const params = new URLSearchParams({
        q: validatedQuery.query,
        page: validatedQuery.page.toString(),
        limit: validatedQuery.limit.toString()
      })
      
      const response = await fetch(`/api/search?${params}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Validate API response structure
      if (!Array.isArray(data) && !data.results) {
        throw new Error('Invalid search API response format')
      }
      
      const results = Array.isArray(data) ? data : (data.results || [])
      console.info(`[ENTERPRISE QUERY] Search returned ${results.length} results`)
      
      return results
    },
    enabled: !!validatedQuery,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  })

  // 🔒 ENTERPRISE ERROR HANDLING: Show search errors
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <EnterpriseError
              error={error}
              context="SearchPageClient"
              onRetry={refetch}
              queryKey={['search', validatedQuery]}
              fallbackData={[]}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Search
          </h1>
          
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators and content..."
              className={`w-full px-4 py-3 pl-12 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 ${
                validationError 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-slate-600 focus:ring-purple-500'
              }`}
              maxLength={200} // Prevent overly long inputs
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          
          {/* 🔒 ENTERPRISE VALIDATION: Show validation errors */}
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-800 dark:text-red-200 text-sm">
                ⚠️ {validationError}
              </p>
            </div>
          )}
          
          {/* 🔥 M7 PHASE 3: Visual feedback for pending search */}
          <div style={{ 
            opacity: query !== deferredQuery ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}>
            {deferredQuery && !validationError && (
              <div className="mt-8">
                <p className="text-center text-gray-600 dark:text-slate-400 mb-4">
                  {query !== deferredQuery ? (
                    <span>Updating results for "{deferredQuery}"...</span>
                  ) : isLoading ? (
                    <span>Searching for "{deferredQuery}"...</span>
                  ) : (
                    <span>Results for "{deferredQuery}" ({searchResults?.length || 0} found)</span>
                  )}
                </p>
                
                {/* 🔒 ENTERPRISE SEARCH RESULTS */}
                <div className="space-y-4">
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-lg animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))
                  ) : searchResults && searchResults.length > 0 ? (
                    // Search results
                    searchResults.map((result: any, index: number) => (
                      <div key={index} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {result.title || result.name || 'Search Result'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {result.description || result.bio || 'No description available'}
                        </p>
                        {result.category && (
                          <span className="inline-block mt-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded">
                            {result.category}
                          </span>
                        )}
                      </div>
                    ))
                  ) : validatedQuery ? (
                    // No results
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-lg text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No results found for "{validatedQuery.query}". Try a different search term.
                      </p>
                    </div>
                  ) : (
                    // Default state
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg">
                      <p className="text-sm text-gray-500">Enter a search term to find creators and content...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 🔒 ENTERPRISE WRAPPER: Export with error boundary
export default function SearchPageClient() {
  return (
    <EnterpriseErrorBoundary 
      context="SearchPageClient"
      queryKey={['search']}
    >
      <SearchPageClientInner />
    </EnterpriseErrorBoundary>
  )
}
