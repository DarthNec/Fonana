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

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fonana - Web3 Content Platform',
  description: 'Share exclusive content with your fans using cryptocurrency',
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
              <NotificationProvider>
                <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
                  <Navbar />
                  <main className="pt-0 flex-1">
                    {children}
                  </main>
                  <footer className="bg-slate-800 dark:bg-slate-950 border-t border-slate-700 dark:border-slate-800 py-4">
                    <div className="container mx-auto px-4 text-center">
                      <p className="text-slate-400 text-sm">
                        Fonana v1.0.0-beta.2 | © 2025 Fonana. All rights reserved.
                      </p>
                    </div>
                  </footer>
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
        </ThemeProvider>
      </body>
    </html>
  )
} 