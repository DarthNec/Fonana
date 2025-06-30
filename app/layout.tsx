import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/WalletProvider'
import { WalletPersistenceProvider } from '@/components/WalletPersistenceProvider'
import { UserProvider } from '@/components/UserProvider'
import { NotificationProvider } from '@/lib/contexts/NotificationContext'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import ReferralNotification from '@/components/ReferralNotification'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { headers } from 'next/headers'
import SolanaRateDisplay from '@/components/SolanaRateDisplay'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fonana - Decentralized Content Platform',
  description: 'Share exclusive content and earn with cryptocurrency',
  metadataBase: new URL('https://fonana.me'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fonana',
  },
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
  const isNewReferral = headersList.get('x-is-new-referral')
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Force refresh script for version management */}
        <script src="/force-refresh.js?v=1751291886000" />
        {referrer && (
          <meta name="x-fonana-referrer" content={referrer} />
        )}
        {isNewReferral && (
          <meta name="x-is-new-referral" content={isNewReferral} />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            <WalletProvider>
              <WalletPersistenceProvider>
                <UserProvider>
                  <NotificationProvider>
                    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
                      {/* Navbar только на десктопе */}
                      <div className="hidden md:block">
                        <Navbar />
                      </div>
                      <main className="pt-0 flex-1 pb-14 md:pb-0 md:pt-20">
                        {children}
                      </main>
                      <ReferralNotification />
                      <Footer />
                      <div className="block md:hidden">
                        <BottomNav />
                      </div>
                    </div>
                    <ServiceWorkerRegistration />
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
              </WalletPersistenceProvider>
            </WalletProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
} 