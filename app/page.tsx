'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
    
    // Редирект на /creators
    router.replace('/creators')
  }, [router, searchParams])
  
  // Loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to explore...</p>
      </div>
    </div>
  )
}
