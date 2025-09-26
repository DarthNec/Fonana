'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { useUser } from '@/lib/store/appStore'
import { MobileWalletConnect } from '@/components/MobileWalletConnect'
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

  const handleRegister = useCallback(async () => {
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
  }, [connected, publicKey, referrerId, router])

  // Эффект для автоматической регистрации при подключении кошелька
  useEffect(() => {
    if (connected && publicKey && !isLoading) {
      // Автоматически запускаем регистрацию при подключении кошелька
      handleRegister()
    }
  }, [connected, publicKey, isLoading, handleRegister])

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
            <div className="w-full [&>*]:w-full">
              <MobileWalletConnect />
              {/* Применяем стили через CSS переменные и селекторы */}
              <style dangerouslySetInnerHTML={{
                __html: `
                  .wallet-adapter-button, 
                  button[style*="backgroundColor"] {
                    background: rgb(15, 20, 30) !important;
                    color: white !important;
                    font-weight: 700 !important;
                    padding: 16px 24px !important;
                    border-radius: 12px !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    box-shadow: 0 10px 15px -3px rgba(15, 20, 30, 0.3), 0 4px 6px -2px rgba(15, 20, 30, 0.2) !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    border: none !important;
                    transform: scale(1) !important;
                    font-size: 16px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                  }
                  
                  .wallet-adapter-button:hover:not(:disabled),
                  button[style*="backgroundColor"]:hover:not(:disabled) {
                    background: rgba(15, 20, 30, 0.8) !important;
                    transform: scale(1.05) !important;
                    box-shadow: 0 20px 25px -5px rgba(15, 20, 30, 0.4), 0 10px 10px -5px rgba(15, 20, 30, 0.3) !important;
                  }
                  
                  .wallet-adapter-button:disabled,
                  button[style*="backgroundColor"]:disabled {
                    opacity: 0.5 !important;
                    cursor: not-allowed !important;
                    transform: scale(1) !important;
                  }
                `
              }} />
            </div>
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

              {/* Registration Status */}
              {isLoading ? (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white font-medium">Completing registration...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-white font-medium text-center">Registration will complete automatically</p>
                  </div>
                </div>
              )}
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
