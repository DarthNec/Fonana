import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '../components/WalletProvider'
import { Navbar } from '../components/Navbar'
import { UserProvider } from '../components/UserProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
})

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
          </UserProvider>
        </WalletProvider>
      </body>
    </html>
  )
} 