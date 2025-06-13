'use client'

import { isUserSubscribedTo, getUserSubscription, mockUserSubscriptions, getCreatorById } from '@/lib/mockData'

export default function SubscriptionsTestPage() {
  const testCreators = [1, 4, 8] // Anna Crypto, Alex NFT, Emma Charts
  
  const handleTestSubscription = (creatorId: number) => {
    const isSubscribed = isUserSubscribedTo(creatorId)
    const subscription = getUserSubscription(creatorId)
    const creator = getCreatorById(creatorId)
    
    console.log(`=== TESTING CREATOR ${creatorId} (${creator?.name}) ===`)
    console.log('Is subscribed:', isSubscribed)
    console.log('Subscription details:', subscription)
    console.log('=== END TEST ===')
    
    alert(`Creator: ${creator?.name}\nSubscribed: ${isSubscribed ? 'YES' : 'NO'}\nPlan: ${subscription?.plan || 'None'}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🧪 Subscriptions Test Page</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📋 All Mock Subscriptions</h2>
        <div className="grid gap-4">
          {mockUserSubscriptions.map((sub) => {
            const creator = getCreatorById(sub.creatorId)
            return (
              <div key={sub.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{creator?.name} (ID: {sub.creatorId})</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Plan: {sub.plan}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Price: {sub.price} SOL
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Valid: {sub.subscribedAt} - {sub.validUntil}
                    </p>
                    <p className="text-sm">
                      Status: <span className={sub.isActive ? 'text-green-600' : 'text-red-600'}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleTestSubscription(sub.creatorId)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Test
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🔍 Quick Tests</h2>
        <div className="grid gap-4">
          {testCreators.map((creatorId) => {
            const creator = getCreatorById(creatorId)
            const isSubscribed = isUserSubscribedTo(creatorId)
            const subscription = getUserSubscription(creatorId)
            
            return (
              <div key={creatorId} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{creator?.name} (ID: {creatorId})</h3>
                    <p className="text-sm">
                      Subscribed: <span className={isSubscribed ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {isSubscribed ? 'YES' : 'NO'}
                      </span>
                    </p>
                    {subscription && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Plan: {subscription.plan} | Until: {subscription.validUntil}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleTestSubscription(creatorId)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Test Function
                    </button>
                    <a 
                      href={`/creator/${creatorId}`}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      View Page
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">📝 Debug Notes</h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Open browser console to see detailed debug information. Check that:
        </p>
        <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
          <li>Anna Crypto (ID: 1) should show as subscribed with Premium plan</li>
          <li>Alex NFT (ID: 4) should show as subscribed with Basic plan</li>
          <li>Emma Charts (ID: 8) should show as subscribed with VIP plan</li>
        </ul>
      </div>
    </div>
  )
} 