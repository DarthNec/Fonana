'use client'

import { useState, useEffect } from 'react'
import Avatar from './Avatar'
import { 
  XMarkIcon,
  LockClosedIcon,
  CheckIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { toast } from 'react-hot-toast'
import { 
  createPostPurchaseTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'

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
  }
  onClose: () => void
  onSuccess?: () => void
}

export default function PurchaseModal({ post, onClose, onSuccess }: PurchaseModalProps) {
  const { publicKey, connected, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [creatorData, setCreatorData] = useState<any>(null)

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
    if (!publicKey || !connected) {
      toast.error('Пожалуйста, подключите кошелек')
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

    setIsProcessing(true)

    try {
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        post.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Create transaction
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        preflightCommitment: 'confirmed',
        skipPreflight: false
      })
      
      console.log('Transaction sent:', signature)

      // Ждем небольшую паузу перед отправкой на бекенд
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Process payment on backend
      const response = await fetch('/api/posts/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userId: publicKey.toBase58(),
          price: post.price,
          currency: post.currency,
          signature,
          creatorId: post.creator.id,
          hasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обработки платежа')
      }

      toast.success('Пост успешно куплен!')
      
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()

    } catch (error) {
      console.error('Payment error:', error)
      
      let errorMessage = 'Произошла ошибка при оплате'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Вы отменили транзакцию'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
            Купить доступ к посту
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Получите полный доступ к эксклюзивному контенту
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
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatSolAmount(post.price)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ≈ ${(post.price * 45).toFixed(2)} USD
              </p>
            </div>
          </div>
        </div>

        {/* Payment distribution */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Создатель получит:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatSolAmount(post.price * 0.9)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Комиссия платформы:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatSolAmount(post.price * (hasReferrerDisplay ? 0.05 : 0.1))}
            </span>
          </div>
          {hasReferrerDisplay && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Реферальная комиссия:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatSolAmount(post.price * 0.05)}
              </span>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Пожизненный доступ
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Контент останется доступным навсегда
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Мгновенный доступ
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Сразу после подтверждения оплаты
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Безопасная оплата
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Через блокчейн Solana
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {!connected ? (
            <div className="flex justify-center">
              <WalletMultiButton />
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
                  <span>Обработка...</span>
                </>
              ) : (
                <>
                  <ShoppingCartIcon className="w-5 h-5" />
                  <span>Купить за {formatSolAmount(post.price)}</span>
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
} 