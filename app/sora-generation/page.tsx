import dynamic from 'next/dynamic'
import ClientShell from '@/components/ClientShell'

const SoraGenerationPageClient = dynamic(() => import('@/components/SoraGenerationPageClient'), { ssr: false })

export default function SoraGenerationPage() {
  return (
    <ClientShell>
      <SoraGenerationPageClient />
    </ClientShell>
  )
}

