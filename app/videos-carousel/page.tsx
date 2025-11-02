'use client'

import ClientShell from '@/components/ClientShell'
import TikTokVideoViewerComponent from '@/components/TikTokVideoViewerComponent'
import { useRouter } from 'next/navigation'

export default function VideosCarouselPage() {
  const router = useRouter()

  const handleClose = () => {
    router.back()
  }

  return (
    <ClientShell>
      <TikTokVideoViewerComponent onClose={handleClose} />
    </ClientShell>
  )
}

