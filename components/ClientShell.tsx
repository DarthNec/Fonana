"use client"

import dynamic from 'next/dynamic'
import { WalletProvider } from '@/components/WalletProvider'
import { WalletPersistenceProvider } from '@/components/WalletPersistenceProvider'
import { AppProvider } from '@/lib/providers/AppProvider'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { Navbar } from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import ErrorBoundary from '@/components/ErrorBoundary'
import ReferralNotification from '@/components/ReferralNotification'
import Footer from '@/components/Footer'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { useState, useEffect } from 'react'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Dynamic import of Toaster to prevent SSR useContext errors
 * 
 * Context: react-hot-toast uses React Context internally which causes
 * "Cannot read properties of null (reading 'useContext')" during SSR
 * 
 * Solution: Dynamic import with { ssr: false } ensures Toaster only
 * loads on client-side after hydration
 * 
 * Related: docs/debug/ssr-usecontext-deep-analysis-2025-020/
 */
const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { 
    ssr: false,
    loading: () => null
  }
)

// 🔥 ALTERNATIVE SOLUTION - PHASE 2: React Query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <SkeletonLoader variant="default" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <WalletProvider>
            <WalletPersistenceProvider>
              <AppProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
                <div className="hidden md:block">
                  <Navbar />
                </div>
                <main className="pt-0 flex-1 pb-14 md:pb-0 md:pt-20">
                  {children}
                </main>
                <ReferralNotification />
                <Footer />
                <div className="block md:hidden">
                  <BottomNav />
                </div>
              </div>
              <ServiceWorkerRegistration />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                  },
                }}
              />
            </AppProvider>
          </WalletPersistenceProvider>
        </WalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
    </QueryClientProvider>
  )
} 