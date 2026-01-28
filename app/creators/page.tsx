import dynamic from 'next/dynamic'
import ClientShell from '@/components/ClientShell'

const ExplorePageClient = dynamic(() => import('@/components/ExplorePageClient'), { ssr: false })

export default function CreatorsPage() {
  return (
    <ClientShell>
      <ExplorePageClient />
    </ClientShell>
  )
} 