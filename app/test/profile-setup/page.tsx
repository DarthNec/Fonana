'use client'

import { useState } from 'react'
import ProfileSetupModal from '@/components/ProfileSetupModal'
import { useWallet } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'

export default function ProfileSetupTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { publicKey } = useWallet()
  
  const handleComplete = async (profileData: any) => {
    console.log('Profile data received:', profileData)
    toast.success('Profile setup completed!')
    setIsModalOpen(false)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Profile Setup Modal Test
        </h1>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Instructions
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            Click the button below to test the profile setup modal that new users see when they first connect their wallet.
          </p>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105"
          >
            Open Profile Setup Modal
          </button>
        </div>
        
        {publicKey && (
          <ProfileSetupModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onComplete={handleComplete}
            userWallet={publicKey.toString()}
          />
        )}
        
        {!publicKey && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to test the profile setup modal.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 