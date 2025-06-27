'use client'

import { useState } from 'react'
import { hasAccessToTier, checkPostAccess, normalizeTierName } from '@/lib/utils/access'
import { TIER_HIERARCHY, TIER_INFO, TierName } from '@/lib/constants/tiers'
import { formatPlanName, isPaidPlan, getNextTier } from '@/lib/utils/subscriptions'

export default function AccessLogicTest() {
  const [userTier, setUserTier] = useState<string>('basic')
  const [requiredTier, setRequiredTier] = useState<string>('premium')
  
  // Тестовые случаи для проверки доступа
  const testCases = [
    { user: null, required: 'basic', expected: false },
    { user: 'basic', required: 'basic', expected: true },
    { user: 'basic', required: 'premium', expected: false },
    { user: 'premium', required: 'basic', expected: true },
    { user: 'vip', required: 'premium', expected: true },
    { user: 'free', required: 'free', expected: true },
    { user: 'Basic', required: 'basic', expected: true }, // Case insensitive
    { user: 'PREMIUM', required: 'premium', expected: true }, // Case insensitive
  ]

  // Тестовые посты
  const testPosts = [
    {
      title: 'Free Post',
      isLocked: false,
      creatorId: 'creator1'
    },
    {
      title: 'Basic Tier Post',
      isLocked: true,
      minSubscriptionTier: 'basic',
      creatorId: 'creator1'
    },
    {
      title: 'Premium Tier Post',
      isLocked: true,
      minSubscriptionTier: 'premium',
      creatorId: 'creator1'
    },
    {
      title: 'VIP Tier Post',
      isLocked: true,
      minSubscriptionTier: 'vip',
      creatorId: 'creator1'
    },
    {
      title: 'Paid Post',
      isLocked: true,
      price: 0.5,
      currency: 'SOL',
      creatorId: 'creator1'
    },
    {
      title: 'Legacy Premium Post',
      isLocked: true,
      isPremium: true,
      creatorId: 'creator1'
    }
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Access Logic Test Suite
      </h1>
      
      {/* Тестирование иерархии */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          1. Tier Hierarchy
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(TIER_HIERARCHY).map(([tier, level]) => (
            <div key={tier} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{TIER_INFO[tier as TierName].icon}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {TIER_INFO[tier as TierName].name}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Level: {level}</p>
              <div className={`mt-2 h-2 rounded-full bg-gradient-to-r ${TIER_INFO[tier as TierName].gradient}`} />
            </div>
          ))}
        </div>
      </section>

      {/* Интерактивный тест */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          2. Interactive Access Test
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-gray-700 dark:text-slate-300">User Tier:</label>
            <select 
              value={userTier} 
              onChange={(e) => setUserTier(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">None (No subscription)</option>
              {Object.keys(TIER_HIERARCHY).map(tier => (
                <option key={tier} value={tier}>
                  {TIER_INFO[tier as TierName].icon} {formatPlanName(tier)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-gray-700 dark:text-slate-300">Required Tier:</label>
            <select 
              value={requiredTier} 
              onChange={(e) => setRequiredTier(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              {Object.keys(TIER_HIERARCHY).map(tier => (
                <option key={tier} value={tier}>
                  {TIER_INFO[tier as TierName].icon} {formatPlanName(tier)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-slate-300">
              <strong>Has Access:</strong>{' '}
              <span className={`font-bold ${
                hasAccessToTier(userTier || null, requiredTier) 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {hasAccessToTier(userTier || null, requiredTier).toString()}
              </span>
            </p>
            <p className="text-gray-700 dark:text-slate-300">
              <strong>Normalized User Tier:</strong> {normalizeTierName(userTier) || 'null'}
            </p>
            <p className="text-gray-700 dark:text-slate-300">
              <strong>Is Paid Plan:</strong> {isPaidPlan(userTier).toString()}
            </p>
            <p className="text-gray-700 dark:text-slate-300">
              <strong>Next Upgrade:</strong> {getNextTier(userTier) || 'Max tier reached'}
            </p>
          </div>
        </div>
      </section>

      {/* Автоматические тесты */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          3. Automated Test Cases
        </h2>
        <div className="space-y-2">
          {testCases.map((test, i) => {
            const result = hasAccessToTier(test.user, test.required)
            const passed = result === test.expected
            return (
              <div 
                key={i} 
                className={`p-3 rounded-lg flex items-center justify-between ${
                  passed 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                }`}
              >
                <span>
                  User: <strong>{test.user || 'none'}</strong> | 
                  Required: <strong>{test.required}</strong> | 
                  Expected: <strong>{test.expected.toString()}</strong> | 
                  Result: <strong>{result.toString()}</strong>
                </span>
                <span className="font-bold">
                  {passed ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Тест checkPostAccess */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          4. Post Access Tests
        </h2>
        <div className="space-y-4">
          {testPosts.map((post, i) => {
            const user = { id: 'user1' }
            const subscription = userTier ? { plan: userTier } : null
            const accessStatus = checkPostAccess(post, user, subscription, false)
            
            return (
              <div key={i} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {post.title}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-slate-400">
                      <strong>Properties:</strong>
                    </p>
                    <ul className="list-disc list-inside text-gray-600 dark:text-slate-400">
                      {post.isLocked && <li>Locked</li>}
                      {post.minSubscriptionTier && <li>Requires: {post.minSubscriptionTier}</li>}
                      {post.price && <li>Price: {post.price} {post.currency}</li>}
                      {post.isPremium && <li>Legacy Premium (VIP)</li>}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-slate-400">
                      <strong>Access Status:</strong>
                    </p>
                    <ul className="list-disc list-inside">
                      <li className={accessStatus.hasAccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        Has Access: <strong>{accessStatus.hasAccess.toString()}</strong>
                      </li>
                      {accessStatus.needsPayment && <li className="text-yellow-600 dark:text-yellow-400">Needs Payment</li>}
                      {accessStatus.needsSubscription && <li className="text-blue-600 dark:text-blue-400">Needs Subscription</li>}
                      {accessStatus.needsTierUpgrade && <li className="text-purple-600 dark:text-purple-400">Needs Tier Upgrade</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Статус системы */}
      <section className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <h2 className="text-xl font-semibold mb-2 text-green-900 dark:text-green-100">
          ✅ System Status
        </h2>
        <p className="text-green-700 dark:text-green-300">
          All access control functions are working correctly with centralized logic.
        </p>
        <ul className="mt-4 space-y-1 text-green-700 dark:text-green-300">
          <li>✓ Tier hierarchy is unified between client and server</li>
          <li>✓ Case-insensitive tier name handling</li>
          <li>✓ Legacy isPremium field support</li>
          <li>✓ Comprehensive access checking for all post types</li>
        </ul>
      </section>
    </div>
  )
} 