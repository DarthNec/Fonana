import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { UserProvider } from '@/components/UserProvider'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import dynamic from 'next/dynamic'

// Динамически импортируем WalletDebugger только в dev режиме
const WalletDebugger = dynamic(() => import('@/components/WalletDebugger'), {
  ssr: false
})

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fonana - Web3 Creator Platform',
  description: 'Decentralized creator platform with crypto payments and NFT subscriptions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <WalletProvider>
            <UserProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
                <Navbar />
                <main className="pt-0">
                  {children}
                </main>
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                  },
                }}
              />
              {process.env.NODE_ENV === 'development' && <WalletDebugger />}
            </UserProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 