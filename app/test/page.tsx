import Link from 'next/link'

const testPages = [
  { href: '/test/purchase-test', title: 'Purchase Modal Test', description: 'Test PurchaseModal with UserContext integration' },
  { href: '/test/unified-posts', title: 'Unified Posts', description: 'Test unified post system' },
  { href: '/test/pricing', title: 'Pricing', description: 'Test dynamic pricing system' },
  { href: '/test/post-management', title: 'Post Management', description: 'Test post CRUD operations' },
  { href: '/test/subscriptions', title: 'Subscriptions', description: 'Test subscription system' },
  { href: '/test/profile-setup', title: 'Profile Setup', description: 'Test profile setup flow' },
  { href: '/test/avatars', title: 'Avatars', description: 'Test avatar generation' },
  { href: '/test/avatar-demo', title: 'Avatar Demo', description: 'Avatar demo page' },
  { href: '/test/browser-detection', title: 'Browser Detection', description: 'Test browser detection' },
  { href: '/test/comments', title: 'Comments', description: 'Test comments system' },
  { href: '/test/debug', title: 'Debug', description: 'Debug information' },
  { href: '/test/mobile-debug', title: 'Mobile Debug', description: 'Mobile debug info' },
  { href: '/test/mobile-error', title: 'Mobile Error', description: 'Mobile error testing' },
  { href: '/test/providers', title: 'Providers', description: 'Test providers' },
  { href: '/test/simple', title: 'Simple', description: 'Simple test page' },
  { href: '/test/wallet-debug', title: 'Wallet Debug', description: 'Wallet debugging' },
  {
    href: '/test/creator-data',
    title: 'Creator Data',
    description: 'Test centralized creator data management'
  },
  {
    href: '/test/creator-data-v2',
    title: 'Creator Data v2',
    description: 'Test optimistic updates, WebSocket, and cross-tab sync'
  },
  {
    href: '/test/purchase-test',
    title: 'Purchase Test',
    description: 'Test purchase modal and payment flow'
  },
  {
    href: '/test/realtime-demo',
    title: 'Real-time Demo',
    description: 'Test WebSocket real-time updates for notifications and feed'
  }
]

export default function TestIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Test Pages</h1>
        
        <div className="grid gap-4">
          {testPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-1">
                {page.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {page.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 