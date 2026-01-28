import dynamic from 'next/dynamic'
import ClientShell from '@/components/ClientShell'

const BookmarksPageClient = dynamic(() => import('@/components/BookmarksPageClient'), { ssr: false })

export default function BookmarksPage() {
  return (
    <ClientShell>
      <BookmarksPageClient />
    </ClientShell>
  )
}

