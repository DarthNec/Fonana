import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'

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