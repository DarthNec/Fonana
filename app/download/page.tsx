import DownloadApplicationPage from '@/components/DownloadApplicationPage'
import ClientShell from '@/components/ClientShell'

export const metadata = {
  title: 'Download Fonana - Mobile App',
  description: 'Download Fonana mobile app for Android and iOS'
}

export default function DownloadPage() {
  return (
    <ClientShell>
      <DownloadApplicationPage />
    </ClientShell>
  )
}

