'use client'

import { useState } from 'react'
import ClientShell from '@/components/ClientShell'
import UserSubscriptions from '@/components/UserSubscriptions'
import SubscriptionManager from '@/components/SubscriptionManager'
import { 
  CreditCardIcon, 
  EyeIcon 
} from '@heroicons/react/24/outline'

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'visibility'>('list')

  return (
    <ClientShell>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Subscription Management
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
              Manage your active subscriptions, upgrade tiers, and control visibility preferences
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'list'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5" />
                  My Subscriptions
                </div>
              </button>
              <button
                onClick={() => setActiveTab('visibility')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'visibility'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-5 h-5" />
                  Visibility Settings
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-6xl mx-auto">
            {activeTab === 'list' ? (
              <div className="space-y-8">
                <UserSubscriptions />
                
                {/* Help Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    💡 How to manage subscriptions
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-blue-800 dark:text-blue-200 text-sm">
                    <div>
                      <strong>Upgrade Tier:</strong> Click "Upgrade" to access higher tier content
                    </div>
                    <div>
                      <strong>Cancel:</strong> Cancel anytime - access continues until expiry
                    </div>
                    <div>
                      <strong>View Profile:</strong> Visit creator's page to see all content
                    </div>
                    <div>
                      <strong>Expiry:</strong> Red warning when less than 7 days left
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <SubscriptionManager />
                
                {/* Help Section */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                    👁️ Visibility Controls
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-green-800 dark:text-green-200 text-sm">
                    <div>
                      <strong>Visible:</strong> Shows in creators carousel and recommendations
                    </div>
                    <div>
                      <strong>Hidden:</strong> Subscription active but creator hidden from public view
                    </div>
                    <div>
                      <strong>Privacy:</strong> Hidden creators don't appear in your public profile
                    </div>
                    <div>
                      <strong>Access:</strong> You keep full access to content regardless of visibility
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientShell>
  )
} 