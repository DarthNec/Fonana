'use client'

import dynamic from 'next/dynamic'
import ClientShell from '@/components/ClientShell'
import { useSearchParams } from 'next/navigation'

const ExplorePageClient = dynamic(() => import('@/components/ExplorePageClient'), { ssr: false })
const ExplorePageClientMobile = dynamic(() => import('@/components/ExplorePageClientMobile'), { ssr: false })

export default function CreatorsPage() {
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  
  // Если есть filter (public или premium), показываем версию с сеткой на всех экранах
  const showGridView = filter === 'public' || filter === 'premium'
  
  return (
    <ClientShell>
      {showGridView ? (
        // Версия с сеткой для фильтрованных постов (на мобильном и десктопе)
        <ExplorePageClient />
      ) : (
        <>
          {/* Desktop version */}
          <div className="hidden md:block">
            <ExplorePageClient />
          </div>
          
          {/* Mobile version */}
          <div className="block md:hidden">
            <ExplorePageClientMobile />
          </div>
        </>
      )}
    </ClientShell>
  )
} 