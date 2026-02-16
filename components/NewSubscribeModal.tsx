'use client'

import React, { useState } from 'react'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useStableWallet } from '@/lib/hooks/useStableWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { connection } from '@/lib/solana/connection'
import { XMarkIcon, LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { createSubscriptionTransaction, calculatePaymentDistribution } from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { refreshSubscriptionStatus } from '@/lib/utils/subscriptions'
import { jwtManager } from '@/lib/utils/jwt'
import { DEFAULT_TIER_PRICES } from '@/lib/constants/tiers'
import { safeToFixed } from '@/lib/utils/format'
import Avatar from '@/components/Avatar'

interface NewSubscribeModalProps {
  creator: {
    id: string | number
    name?: string
    nickname?: string
    avatar?: string
    isVerified?: boolean
  }
  onClose: () => void
  onSuccess?: (data?: any) => void
}

export default function NewSubscribeModal({ creator, onClose, onSuccess }: NewSubscribeModalProps) {
  const { connected, sendTransaction, publicKey } = useWallet()
  const { publicKeyString } = useStableWallet()
  const { setVisible } = useSafeWalletModal()
  const { rate: solRate } = useSolRate()
  const [isProcessing, setIsProcessing] = useState(false)

  const BASIC_PRICE = DEFAULT_TIER_PRICES.basic // 0.05 SOL
  const creatorName = creator.nickname || creator.name || 'Creator'

  const handleSubscribe = async () => {
    if (!connected || !publicKeyString) {
      setVisible(true)
      toast.success('Подключите кошелёк для оформления подписки')
      return
    }

    setIsProcessing(true)

    try {
      const jwtToken = await jwtManager.getToken()
      if (!jwtToken) {
        throw new Error('Not authenticated')
      }

      // Получаем данные креатора
      const creatorResponse = await fetch(`/api/creators/${creator.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Creator not found')
      }

      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Кошелёк креатора не настроен')
        return
      }

      // Проверка что не подписываемся на себя
      if (creatorWallet === publicKeyString) {
        toast.error('Нельзя подписаться на себя')
        return
      }

      // Определяем наличие реферера
      const referrerWallet = creatorData.creator.referrer?.solanaWallet || creatorData.creator.referrer?.wallet
      const hasReferrer = creatorData.creator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)

      // Рассчитываем распределение платежа
      const distribution = calculatePaymentDistribution(
        BASIC_PRICE,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Создаём транзакцию
      if (!publicKey) {
        throw new Error('Public key is not available')
      }

      const transaction = await createSubscriptionTransaction(
        publicKey,
        distribution
      )

      // Получаем свежий blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight

      // Отправляем транзакцию
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }

      const signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Ожидание подтверждения блокчейна...')
      
      // Даём время транзакции попасть в сеть
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Обрабатываем платёж на бэкенде
      const response = await fetch('/api/subscriptions/process-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          creatorId: creator.id,
          plan: 'Basic',
          price: BASIC_PRICE,
          originalPrice: BASIC_PRICE,
          signature,
          hasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки платежа')
      }
      
      toast.success(`Вы подписались на ${creatorName}!`)
      
      // Обновляем состояние подписки
      await refreshSubscriptionStatus(creator.id.toString())
      
      // Обновляем localStorage с подписками
      try {
        // Получаем userId из fonana-app-store (Zustand persist store)
        const appStoreStr = localStorage.getItem('fonana-app-store')
        if (appStoreStr) {
          const appStore = JSON.parse(appStoreStr)
          const userId = appStore?.state?.user?.id
          
          if (userId) {
            // Получаем свежий список подписок
            const subsResponse = await fetch(`/api/subscriptions/check?userId=${userId}`)
            if (subsResponse.ok) {
              const subsData = await subsResponse.json()
              localStorage.setItem("user_subscriptions", JSON.stringify(subsData || null))
              console.log('[NewSubscribeModal] Updated subscriptions in localStorage:', subsData)
            }
          }
        }
      } catch (storageError) {
        console.error('[NewSubscribeModal] Error updating localStorage:', storageError)
      }
      
      // Вызываем callback успеха
      if (onSuccess) {
        onSuccess({
          plan: 'Basic',
          subscription: data.subscription
        })
      }
      
      onClose()

    } catch (error: any) {
      console.error('[NewSubscribeModal] Error:', error)
      toast.error(error.message || 'Ошибка при оформлении подписки')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
              <LockClosedIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Subscription
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Creator info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl mb-6">
            <div className="flex-shrink-0">
              {creator.avatar ? (
                <img 
                  src={creator.avatar} 
                  alt={creatorName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-purple-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center border-2 border-purple-500">
                  <span className="text-white text-xl font-bold">
                    {creatorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-slate-400">Subscribe to</p>
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                @{creatorName}
              </p>
            </div>
          </div>

          {/* Price info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {BASIC_PRICE}
              </span>
              <span className="text-xl font-medium text-gray-600 dark:text-slate-400">
                SOL
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {solRate > 0 && `≈ $${safeToFixed(BASIC_PRICE * solRate, 2)} USD`} / month
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckIcon className="w-3 h-3 text-green-500" />
              </div>
              <span className="text-gray-700 dark:text-slate-300">Access to exclusive content</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckIcon className="w-3 h-3 text-green-500" />
              </div>
              <span className="text-gray-700 dark:text-slate-300">Private messages with the author</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckIcon className="w-3 h-3 text-green-500" />
              </div>
              <span className="text-gray-700 dark:text-slate-300">Support your favorite author</span>
            </div>
          </div>

          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Subscribe for {BASIC_PRICE} SOL</span>
              </>
            )}
          </button>

          {/* Cancel link */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
