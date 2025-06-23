import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/WalletProvider'
import { UserProvider } from '@/components/UserProvider'
import { NotificationProvider } from '@/lib/contexts/NotificationContext'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ReferralNotification from '@/components/ReferralNotification'
import Footer from '@/components/Footer'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fonana - Decentralized Content Platform',
  description: 'Share exclusive content and earn with cryptocurrency',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  openGraph: {
    title: 'Fonana - Decentralized Content Platform',
    description: 'Share exclusive content and earn with cryptocurrency',
    images: ['/fonanaLogo1.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const referrer = headersList.get('x-fonana-referrer')
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {referrer && (
          <meta name="x-fonana-referrer" content={referrer} />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            <WalletProvider>
              <UserProvider>
                <NotificationProvider>
                  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
                    <Navbar />
                    <main className="pt-0 flex-1">
                      {children}
                    </main>
                    <ReferralNotification />
                    <Footer />
                  </div>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 5000, // Автоматическое закрытие через 5 секунд
                      style: {
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid #334155',
                      },
                    }}
                  />
                </NotificationProvider>
              </UserProvider>
            </WalletProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
} 