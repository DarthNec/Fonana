'use client'

import React, { useState, useEffect } from 'react'
import { Fragment } from 'react'
import Avatar from '@/components/Avatar'
import { useStableWallet } from '@/lib/hooks/useStableWallet' // 🔥 M7 FIX: Stable wallet hook
import { 
  SafeDialog as Dialog,
  SafeDialogPanel,
  SafeTransition as Transition,
  SafeTransitionChild
} from '@/components/ui/ssr-safe'
import { 
  XMarkIcon, 
  CurrencyDollarIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  ShoppingCartIcon,
  CheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { SafeWalletButton } from '@/components/ui/ssr-safe'
import { toast } from 'react-hot-toast'
import { 
  createPostPurchaseTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { useUser, useUserLoading } from '@/lib/store/appStore'
import { refreshPostAccess } from '@/lib/utils/subscriptions'
import { jwtManager } from '@/lib/utils/jwt'
import { safeToFixed, formatSolToUsd } from '@/lib/utils/format'

interface PurchaseModalProps {
  post: {
    id: number | string
    title: string
    price: number
    currency: string
    creator: {
      id: number | string
      name: string
      username: string
      avatar: string | null
      isVerified?: boolean
      wallet?: string | null
      solanaWallet?: string | null
      referrerId?: string | null
      referrer?: {
        solanaWallet?: string | null
        wallet?: string | null
      } | null
    }
    flashSale?: {
      id: string
      discount: number
      endAt: string
      maxRedemptions?: number
      usedCount: number
      remainingRedemptions?: number
      timeLeft: number
    }
  }
  onClose: () => void
  onSuccess?: (data?: any) => void
}

export default function PurchaseModal({ post, onClose, onSuccess }: PurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicKeyString, connected, sendTransaction } = useStableWallet() // 🔥 M7 FIX: Stable wallet
  const { publicKey } = useWallet() // 🔥 FIX: Add publicKey for transaction creation
  const user = useUser()
  const isUserLoading = useUserLoading()
  const [creatorData, setCreatorData] = useState<any>(null)
  const { rate: solToUsdRate, isLoading: isRateLoading } = useSolRate()
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  if (!user) {
    return null
  }
  
  // Вычисляем цену для отображения с учетом Flash Sale
  const displayPrice = post.flashSale 
    ? post.price * (1 - post.flashSale.discount / 100)
    : post.price

  useEffect(() => {
    // Загружаем актуальные данные создателя
    fetch(`/api/creators/${post.creator.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.creator) {
          setCreatorData(data.creator)
        }
      })
      .catch(err => console.error('Error loading creator data:', err))
  }, [post.creator.id])

  const handlePurchase = async () => {
    if (!publicKeyString || !connected) {
      toast.error('Пожалуйста, подключите кошелек')
      return
    }
    
    // Проверяем, что данные пользователя загружены
    if (!user || isUserLoading) {
      toast.error('Загрузка данных пользователя...')
      return
    }
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: запрещаем покупки с кошелька платформы
    const PLATFORM_WALLET = 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw'
    if (publicKeyString === PLATFORM_WALLET) { // 🔥 M7 FIX: Stable string comparison
      toast.error('❌ Вы не можете покупать контент с кошелька платформы!')
      return
    }

    // Используем данные создателя или пост данные
    const finalCreator = creatorData || post.creator
    const creatorWallet = finalCreator.solanaWallet || finalCreator.wallet
    const referrerWallet = finalCreator.referrer?.solanaWallet || finalCreator.referrer?.wallet
    const hasReferrer = finalCreator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)

    if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
      toast.error('Кошелек создателя не настроен')
      return
    }
    
    // Дополнительная проверка: создатель не может покупать свой контент
          if (creatorWallet === publicKeyString) { // 🔥 M7 FIX: Stable string comparison
      toast.error('Вы не можете покупать свой собственный контент')
      return
    }

    setIsProcessing(true)

    try {
      // Если есть Flash Sale, сначала проверяем и применяем его
      let actualPrice = post.price
      let appliedFlashSaleId: string | undefined
      
      if (post.flashSale) {
        try {
          // Проверяем доступность Flash Sale
          const checkResponse = await fetch(`/api/flash-sales/apply/check?flashSaleId=${post.flashSale.id}&userId=${publicKeyString}&price=${post.price}`) // 🔥 M7 FIX
          const checkData = await checkResponse.json()
          
          if (checkData.canApply) {
            actualPrice = checkData.pricing.finalPrice
            appliedFlashSaleId = post.flashSale.id
          }
        } catch (error) {
          console.error('Error checking flash sale:', error)
          // Продолжаем без скидки если проверка не удалась
        }
      }
      
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        actualPrice,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Create transaction
      if (!publicKey) {
        throw new Error('Public key is not available')
      }
      
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      // Проверяем что feePayer установлен правильно
              if (transaction.feePayer?.toBase58() !== publicKeyString) { // 🔥 M7 FIX: Stable comparison
        console.error('CRITICAL: Fee payer mismatch!', {
          transactionFeePayer: transaction.feePayer?.toBase58(),
                      userPublicKey: publicKeyString // 🔥 M7 FIX
        })
        // Принудительно устанавливаем правильный feePayer
        transaction.feePayer = publicKey
      }

      // Send transaction with retry logic
      let signature: string = ''
      let attempts = 0
      const maxAttempts = 3
      
      // Параметры для отправки транзакции
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      while (attempts < maxAttempts) {
        attempts++
        
        try {
          // Получаем свежий blockhash прямо перед отправкой
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
          transaction.recentBlockhash = blockhash
          ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
          
          // Симулируем транзакцию перед отправкой (опционально)
          try {
            const simulation = await connection.simulateTransaction(transaction)
            
            if (simulation.value.err && simulation.value.err !== 'AccountNotFound') {
              console.error('Simulation failed:', simulation.value.err)
              throw new Error(`Симуляция транзакции неуспешна: ${JSON.stringify(simulation.value.err)}`)
            }
          } catch (simError) {
            // Продолжаем даже если симуляция не удалась
          }
          
          signature = await sendTransaction(transaction, connection, sendOptions)
          
          // Успешно отправлено, выходим из цикла
          break
          
        } catch (sendError) {
          if (attempts === maxAttempts) {
            throw new Error(`Не удалось отправить транзакцию после ${maxAttempts} попыток: ${sendError instanceof Error ? sendError.message : 'Неизвестная ошибка'}`)
          }
          // Ждем перед следующей попыткой
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Проверяем транзакцию
      toast.loading('Проверяем транзакцию в блокчейне...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Проверяем статус транзакции
      try {
        const status = await connection.getSignatureStatus(signature)
        if (status.value?.err) {
          throw new Error(`Транзакция отклонена: ${JSON.stringify(status.value.err)}`)
        }
      } catch (statusError) {
        console.error('Error checking transaction status:', statusError)
      }

      // Ждем подтверждения
      toast.loading('Подтверждаем транзакцию в блокчейне...')
      await new Promise(resolve => setTimeout(resolve, 8000))

      // Process payment on backend
      const jwtToken = await jwtManager.getToken()
      if (!jwtToken) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/posts/${post.id}/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          buyerWallet: publicKeyString, // 🔥 M7 FIX
          txSignature: signature,
          price: actualPrice,
          hasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки платежа')
      }

      toast.success('Пост успешно куплен!')
      
      // Обновляем доступ к посту
      await refreshPostAccess(post.id.toString())
      
      // Отправляем WebSocket событие о покупке
      window.dispatchEvent(new CustomEvent('post-purchased', { 
        detail: { 
          postId: post.id,
          userId: user.id,
          purchased: true
        } 
      }))
      
      if (onSuccess) {
        // Передаем данные о покупке для оптимистичного обновления
        onSuccess({
          postId: post.id,
          purchased: true,
          transaction: data.transaction,
          purchase: data.purchase
        })
      }
      
      onClose()
      
      // УБИРАЕМ принудительную перезагрузку страницы
      // setTimeout(() => {
      //   window.location.reload()
      // }, 1000)

    } catch (error) {
      console.error('Payment error:', error)
      
      let errorMessage = 'Произошла ошибка при оплате'
      
      if (error instanceof Error) {
        // Обрабатываем ошибки кошелька Solana
        if (error.message.includes('User rejected') || 
            error.message.includes('user rejected') ||
            error.name === 'WalletSendTransactionError') {
          // Пользователь отменил транзакцию - это нормально
          errorMessage = 'Транзакция отменена'
          toast(errorMessage, { icon: '👋' })
          return // Не показываем как ошибку
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Недостаточно средств на кошельке'
        } else if (error.message.includes('Transaction not confirmed')) {
          errorMessage = 'Транзакция не была подтверждена. Попробуйте еще раз'
        } else if (error.message.includes('block height exceeded')) {
          errorMessage = 'Транзакция истекла. Попробуйте еще раз'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Определяем реальное распределение платежа
  const finalCreator = creatorData || post.creator
  const hasReferrerDisplay = finalCreator.referrerId && finalCreator.referrer && 
    (finalCreator.referrer.solanaWallet || finalCreator.referrer.wallet) &&
    isValidSolanaAddress(finalCreator.referrer.solanaWallet || finalCreator.referrer.wallet)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Buy access to the post
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Get full access to the exclusive content
          </p>
        </div>

        {/* Post info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {post.title}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar
                src={post.creator.avatar}
                alt={post.creator.name}
                seed={post.creator.username}
                size={32}
              />
              <div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {post.creator.name}
                  </span>
                  {post.creator.isVerified && (
                    <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  @{post.creator.username}
                </span>
              </div>
            </div>
            <div className="text-right">
              {post.flashSale ? (
                <>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {formatSolAmount(displayPrice)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ≈ {formatSolToUsd(displayPrice, solToUsdRate)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                    {formatSolAmount(post.price)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {post.flashSale.discount}% OFF!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatSolAmount(post.price)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ≈ {formatSolToUsd(post.price, solToUsdRate)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Flash Sale info */}
        {post.flashSale && (
          <div className="mb-6">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <BoltIcon className="w-5 h-5" />
                <span className="font-medium">Flash Sale: {post.flashSale.discount}% OFF!</span>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Осталось {post.flashSale.remainingRedemptions || '∞'} использований
              </p>
            </div>
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium mt-3">
              <span>Вы экономите:</span>
              <span>
                {formatSolAmount(post.price - displayPrice)}
                <span className="ml-1">
                  (≈ {formatSolToUsd(post.price - displayPrice, solToUsdRate)})
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Lifetime access
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Content will remain accessible forever
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Instant access
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                After payment confirmation
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Secure payment
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Through Solana blockchain
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {!connected ? (
            <div className="flex justify-center">
              <SafeWalletButton />
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShoppingCartIcon className="w-5 h-5" />
                  <span>
                    Buy for {formatSolAmount(displayPrice)}
                    {post.flashSale && (
                      <span className="ml-2 text-sm line-through opacity-75">
                        {formatSolAmount(post.price)}
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 