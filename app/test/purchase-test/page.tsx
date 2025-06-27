'use client'

import { useState } from 'react'
import { useUserContext } from '@/lib/contexts/UserContext'
import PurchaseModal from '@/components/PurchaseModal'

export default function PurchaseTestPage() {
  const { user, isLoading: isUserLoading } = useUserContext()
  const [showModal, setShowModal] = useState(false)

  // Тестовый пост для проверки
  const testPost = {
    id: 'test-123',
    title: 'Test Post for Purchase',
    content: 'This is a test post to check if purchase modal works correctly',
    price: 0.1,
    currency: 'SOL',
    creator: {
      id: 'creator-123',
      name: 'Test Creator',
      username: 'testcreator',
      avatar: null,
      isVerified: true
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Purchase Modal Test</h1>
        
        {/* User Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current User State</h2>
          {isUserLoading ? (
            <p>Loading user data...</p>
          ) : user ? (
            <div className="space-y-2 text-sm">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Wallet:</strong> {user.wallet}</p>
              <p><strong>Nickname:</strong> {user.nickname || 'Not set'}</p>
              <p><strong>Is Creator:</strong> {user.isCreator ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <p className="text-red-500">No user connected! Please connect your wallet.</p>
          )}
        </div>

        {/* Test Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => setShowModal(true)}
            disabled={!user || isUserLoading}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!user ? 'Connect wallet first' : 'Open Purchase Modal'}
          </button>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> This page tests the PurchaseModal with UserContext integration.
            </p>
          </div>
        </div>

        {/* Test Post Preview */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Test Post Data:</h3>
          <pre className="text-xs bg-gray-100 dark:bg-slate-700 p-4 rounded overflow-x-auto">
            {JSON.stringify(testPost, null, 2)}
          </pre>
        </div>

        {/* Modal */}
        {showModal && (
          <PurchaseModal
            post={testPost}
            onClose={() => setShowModal(false)}
            onSuccess={(data) => {
              console.log('Purchase success:', data)
              alert('Purchase successful! Check console for details.')
              setShowModal(false)
            }}
          />
        )}
      </div>
    </div>
  )
} 