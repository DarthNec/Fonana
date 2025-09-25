'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'

export default function ReferalRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { connected, publicKey } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const user = useUser()
  
  const [referrerId, setReferrerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Получаем ID реферера из URL параметров
  useEffect(() => {
    const refId = searchParams.get('ref')
    if (refId) {
      setReferrerId(refId)
      console.log('Referrer ID from URL:', refId)
    }
  }, [searchParams])

  const handleConnectWallet = () => {
    if (!connected) {
      setVisible(true)
      toast.success('Подключите кошелек для регистрации')
    } else {
      // Если кошелек уже подключен, перенаправляем на главную
      router.push('/')
    }
  }

  const handleRegister = async () => {
    if (!connected || !publicKey) {
      toast.error('Подключите кошелек для регистрации')
      return
    }

    setIsLoading(true)
    
    try {
      // Если есть referrerId, отправляем запрос на сохранение
      if (referrerId) {
        console.log('Registering with referrer ID:', referrerId)
        
        const response = await fetch('/api/user/referrals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            wallet: publicKey?.toBase58(),
            referrerId 
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error saving referrer:', errorData)
          toast.error(errorData.error || 'Ошибка при сохранении реферала')
          return
        }

        const result = await response.json()
        console.log('Referrer saved successfully:', result)
        toast.success('Реферал успешно сохранен!')
      }
      
      // Перенаправляем на главную
      window.location.href = '/'
      toast.success('Регистрация успешна!')
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Ошибка при регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Fonana</h1>
          <p className="text-purple-200">Join the creator economy</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Fonana!
            </h2>
          </div>


          {/* Connect Wallet Button */}
          {!connected ? (
            <button
              onClick={handleConnectWallet}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Wallet
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              {/* Wallet Connected Info */}
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Wallet Connected</p>
                    <p className="text-green-200 text-sm">
                      {publicKey?.toBase58().substring(0, 8)}...{publicKey?.toBase58().substring(-8)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Register Button */}
              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Registering...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Complete Registration
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-purple-200 text-sm">
              By connecting your wallet, you agree to our{' '}
              <a href="#" className="text-purple-300 hover:text-white underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-purple-300 hover:text-white underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Debug Info (только в development) */}
      </div>
    </div>
  )
}
