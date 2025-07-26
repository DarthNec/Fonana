import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'

// Отключаем статическую генерацию для решения проблемы с useContext
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fonana - Decentralized Content Platform',
  description: 'Share exclusive content and earn with cryptocurrency',
  metadataBase: new URL('https://fonana.me'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fonana',
  },
  openGraph: {
    title: 'Fonana - Decentralized Content Platform',
    description: 'Share exclusive content and earn with cryptocurrency',
    images: ['/fonanaLogo1.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fonana - Decentralized Content Platform',
    description: 'Share exclusive content and earn with cryptocurrency',
    images: ['/fonanaLogo1.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

// 🔥 FIX: Выносим viewport и themeColor в отдельный export (Next.js 14 requirement)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers()
  const referrer = headersList.get('x-fonana-referrer')
  const isNewReferral = headersList.get('x-is-new-referral')
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {referrer && (
          <meta name="x-fonana-referrer" content={referrer} />
        )}
        {isNewReferral && (
          <meta name="x-is-new-referral" content={isNewReferral} />
        )}
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 