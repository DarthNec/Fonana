import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ClientShell = dynamic(() => import('@/components/ClientShell'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  )
})

const PurchasesPageClient = dynamic(() => import('@/components/PurchasesPageClient'), {
  ssr: false,
  loading: () => <div className="p-4">Loading purchases...</div>
})

export default function PurchasesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientShell>
        <PurchasesPageClient />
      </ClientShell>
    </Suspense>
  )
}
