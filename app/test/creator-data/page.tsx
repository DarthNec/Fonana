'use client'

import { useState } from 'react'
import { CreatorDataProvider, useCreatorData } from '@/lib/contexts/CreatorContext'
import RevenueChart from '@/components/RevenueChart'
import FlashSalesList from '@/components/FlashSalesList'
import { useUserContext } from '@/lib/contexts/UserContext'

// Тестовый компонент для отображения данных создателя
function CreatorDataDisplay() {
  const { creator, isLoading, error, refreshCreator } = useCreatorData()
  const { user } = useUserContext()
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    )
  }
  
  if (!creator) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-6">
        <p className="text-yellow-600 dark:text-yellow-300">No creator data available</p>
      </div>
    )
  }
  
  const isOwner = user?.id === creator.id
  
  return (
    <div className="space-y-6">
      {/* Creator Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Creator Data</h2>
          <button
            onClick={() => refreshCreator()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">ID</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Nickname</p>
            <p className="font-medium text-gray-900 dark:text-white">@{creator.nickname || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Full Name</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Is Creator</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.isCreator ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Followers</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.followersCount || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-slate-400">Posts</p>
            <p className="font-medium text-gray-900 dark:text-white">{creator.postsCount || 0}</p>
          </div>
        </div>
        
        {creator.bio && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Bio</p>
            <p className="text-gray-900 dark:text-white">{creator.bio}</p>
          </div>
        )}
      </div>
      
      {/* Revenue Chart */}
      {creator.isCreator && isOwner && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revenue Analytics</h2>
          <RevenueChart />
        </div>
      )}
      
      {/* Flash Sales */}
      {creator.isCreator && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Flash Sales</h2>
          <FlashSalesList isOwner={isOwner} />
        </div>
      )}
    </div>
  )
}

// Главный компонент страницы
export default function CreatorDataTestPage() {
  const [creatorId, setCreatorId] = useState('')
  const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null)
  const { user } = useUserContext()
  
  const handleTest = () => {
    if (creatorId.trim()) {
      setActiveCreatorId(creatorId.trim())
    }
  }
  
  const handleTestCurrentUser = () => {
    if (user?.id) {
      setCreatorId(user.id)
      setActiveCreatorId(user.id)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Test useCreatorData Hook
        </h1>
        
        {/* Test Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Controls</h2>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Creator ID
              </label>
              <input
                type="text"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                placeholder="Enter creator ID"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <button
              onClick={handleTest}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Test Creator
            </button>
            
            {user && (
              <button
                onClick={handleTestCurrentUser}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Test Current User
              </button>
            )}
          </div>
          
          {activeCreatorId && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Testing creator ID: <span className="font-mono font-medium text-gray-900 dark:text-white">{activeCreatorId}</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Creator Data Display */}
        {activeCreatorId && (
          <CreatorDataProvider creatorId={activeCreatorId}>
            <CreatorDataDisplay />
          </CreatorDataProvider>
        )}
      </div>
    </div>
  )
} 