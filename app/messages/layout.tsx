import { ErrorBoundary } from '@/components/ErrorBoundary'
import ClientShell from '@/components/ClientShell'

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ClientShell>
  )
} 