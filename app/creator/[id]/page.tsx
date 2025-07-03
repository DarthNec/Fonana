import ClientShell from '@/components/ClientShell'
import CreatorPageClient from '@/components/CreatorPageClient'

interface CreatorPageProps {
  params: {
    id: string
  }
}

export default function CreatorPage({ params }: CreatorPageProps) {
  return (
    <ClientShell>
      <CreatorPageClient creatorId={params.id} />
    </ClientShell>
  )
} 