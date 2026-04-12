'use client'

import React, { useState } from 'react'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useStableWallet } from '@/lib/hooks/useStableWallet'
import { connection } from '@/lib/solana/connection'
import { XMarkIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { 
  createSubscriptionTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { jwtManager } from '@/lib/utils/jwt'
import { useSolRate } from '@/lib/hooks/useSolRate'

interface SpinPackage {
  id: string
  spins: number
  priceUsd: number
  priceSol: number
  savings?: string
  popular?: boolean
}

interface BuySpinsModalProps {
  onClose: () => void
  onSuccess?: (spinsAdded: number) => void
}

export default function BuySpinsModal({ onClose, onSuccess }: BuySpinsModalProps) {
  const { connected, sendTransaction, publicKey } = useWallet()
  const { publicKeyString } = useStableWallet()
  const { rate: solRate } = useSolRate()
  const [selectedPackage, setSelectedPackage] = useState<string>('package2')
  const [isProcessing, setIsProcessing] = useState(false)

  // Платформенный кошелёк из env
  const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || ''

  // Пакеты спинов
  const packages: SpinPackage[] = [
    {
      id: 'package1',
      spins: 3,
      priceUsd: 1.99,
      priceSol: solRate ? 1.99 / solRate : 0,
    },
    {
      id: 'package2',
      spins: 6,
      priceUsd: 3.49,
      priceSol: solRate ? 3.49 / solRate : 0,
      savings: '12% cheaper',
      popular: true
    },
    {
      id: 'package3',
      spins: 12,
      priceUsd: 5.99,
      priceSol: solRate ? 5.99 / solRate : 0,
      savings: '25% cheaper'
    }
  ]

  const selectedPkg = packages.find(p => p.id === selectedPackage)

  const handleBuySpins = async () => {
    if (!connected || !publicKeyString) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!selectedPkg) {
      toast.error('Please select a package')
      return
    }

    if (!PLATFORM_WALLET) {
      toast.error('Platform wallet not configured')
      return
    }

    setIsProcessing(true)

    try {
      const jwtToken = await jwtManager.getToken()
      if (!jwtToken) {
        throw new Error('Not authenticated')
      }

      // Валидация цены
      const finalPrice = selectedPkg.priceSol
      if (!finalPrice || finalPrice <= 0 || isNaN(finalPrice)) {
        toast.error('Invalid package price. Please try again.')
        setIsProcessing(false)
        return
      }

      console.log('[BuySpinsModal] Purchase attempt:', {
        package: selectedPkg.id,
        spins: selectedPkg.spins,
        priceUsd: selectedPkg.priceUsd,
        priceSol: finalPrice,
        platformWallet: PLATFORM_WALLET
      })

      // Создаём транзакцию (платёж на платформенный кошелёк)
      const distribution = calculatePaymentDistribution(
        finalPrice,
        PLATFORM_WALLET,
        false, // hasReferrer
        undefined // referrerWallet
      )

      if (!publicKey) {
        throw new Error('Public key is not available')
      }

      const transaction = await createSubscriptionTransaction(
        publicKey,
        distribution
      )

      // Отправляем транзакцию
      let signature: string = ''
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight

      signature = await sendTransaction(transaction, connection, sendOptions)

      toast.loading('Waiting for blockchain confirmation...')

      // Даём время на подтверждение
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Обрабатываем покупку на бэкенде
      const response = await fetch('/api/wheel/buy-spins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          wallet: publicKeyString,
          packageId: selectedPkg.id,
          spins: selectedPkg.spins,
          priceUsd: selectedPkg.priceUsd,
          priceSol: finalPrice,
          signature
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process purchase')
      }

      toast.dismiss()
      toast.success(`🎉 You got ${selectedPkg.spins} spins!`)

      // Вызываем callback для обновления UI
      if (onSuccess) {
        onSuccess(selectedPkg.spins)
      }

      // Закрываем модалку
      setTimeout(() => {
        onClose()
      }, 500)

    } catch (error: any) {
      console.error('[BuySpinsModal] Error:', error)
      toast.dismiss()
      toast.error(error?.message || 'Failed to purchase spins')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Buy Spins</h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Get more chances to win!</p>
            </div>
          </div>
        </div>

        {/* Packages */}
        <div className="p-6 space-y-3">
          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.id
            const pricePerSpin = pkg.priceUsd / pkg.spins

            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/25'
                    : 'border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pkg.spins} Spins
                      </span>
                      {pkg.popular && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        ${pkg.priceUsd}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        ({formatSolAmount(pkg.priceSol)} SOL)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-slate-400">
                        ${pricePerSpin.toFixed(2)} per spin
                      </span>
                      {pkg.savings && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                          {pkg.savings}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checkmark */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-purple-500'
                      : 'bg-gray-200 dark:bg-slate-700'
                  }`}>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={handleBuySpins}
            disabled={isProcessing || !connected}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : !connected ? (
              'Connect Wallet'
            ) : (
              <>
                <span>Buy {selectedPkg?.spins} Spins</span>
                <SparklesIcon className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-slate-400 mt-4">
            Payments are processed on the Solana blockchain
          </p>
        </div>
      </div>
    </div>
  )
}
