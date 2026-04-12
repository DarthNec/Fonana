'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import ClientShell from '@/components/ClientShell'

const ExplorePageClient = dynamic(() => import('@/components/ExplorePageClient'), { ssr: false })
const ExplorePageClientMobile = dynamic(() => import('@/components/ExplorePageClientMobile'), { ssr: false })

export default function HomePage() {
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  
  useEffect(() => {
    // 📊 Извлекаем UTM метки из URL
    const source = searchParams.get('source')
    const campaign = searchParams.get('campaign')
    
    // Сохраняем в localStorage
    if (source) {
      localStorage.setItem('fonana_source', source)
      console.log('✅ [UTM] Source saved:', source)
    } else {
      // Если нет метки → ставим "None"
      if (!localStorage.getItem('fonana_source')) {
        localStorage.setItem('fonana_source', 'None')
        console.log('ℹ️ [UTM] No source param, set to None')
      }
    }
    
    if (campaign) {
      localStorage.setItem('fonana_campaign', campaign)
      console.log('✅ [UTM] Campaign saved:', campaign)
    } else {
      // Если нет метки → ставим "None"
      if (!localStorage.getItem('fonana_campaign')) {
        localStorage.setItem('fonana_campaign', 'None')
        console.log('ℹ️ [UTM] No campaign param, set to None')
      }
    }
    
    // Сохраняем timestamp первого визита
    if (!localStorage.getItem('fonana_first_visit')) {
      localStorage.setItem('fonana_first_visit', new Date().toISOString())
      console.log('📅 [UTM] First visit timestamp saved')
    }
  }, [searchParams])
  
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
