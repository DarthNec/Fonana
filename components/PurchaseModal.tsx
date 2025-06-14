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
  const { connected, publicKey, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [creatorData, setCreatorData] = useState<any>(null)
  
  useEffect(() => {
    // Загружаем полные данные создателя при открытии модала
    if (post.creator.id) {
      fetchCreatorData()
    }
  }, [post.creator.id])
  
  const fetchCreatorData = async () => {
    try {
      const response = await fetch(`/api/user?id=${post.creator.id}`)
      const data = await response.json()
      if (data.user) {
        setCreatorData(data.user)
      }
    } catch (error) {
      console.error('Error fetching creator data:', error)
    }
  }

  const handlePurchase = async () => {
    if (!connected || !publicKey) {
      toast.error('Пожалуйста, подключите кошелек')
      return
    }
    
    // Определяем кошелек создателя
    const creatorWallet = creatorData?.solanaWallet || creatorData?.wallet || post.creator.solanaWallet || post.creator.wallet
    if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
      toast.error('У создателя не настроен кошелек для приема платежей. Пожалуйста, попробуйте позже.')
      // Логируем для отладки
      console.error('Creator wallet issue:', {
        creatorId: post.creator.id,
        creatorData,
        wallets: {
          solanaWallet: creatorData?.solanaWallet,
          wallet: creatorData?.wallet,
          postCreatorSolana: post.creator.solanaWallet,
          postCreatorWallet: post.creator.wallet
        }
      })
      return
    }
    
    // Определяем кошелек реферера если есть
    const referrerWallet = creatorData?.referrer?.solanaWallet || creatorData?.referrer?.wallet
    const hasReferrer = creatorData?.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)

    setIsProcessing(true)
    
    try {
      // Рассчитываем распределение платежа
      const distribution = calculatePaymentDistribution(
        post.price,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )
      
      // Создаем транзакцию
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )
      
      // Отправляем транзакцию
      const signature = await sendTransaction(transaction, connection)
      
      console.log('Transaction sent:', signature)
      
      // Обрабатываем платеж на бэкенде
      const response = await fetch('/api/posts/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userId: publicKey.toString(),
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
      
      toast.success('Контент успешно приобретен!')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка при покупке контента')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Покупка контента
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <Avatar
              src={post.creator.avatar}
              alt={post.creator.name}
              seed={post.creator.username}
              size={40}
              rounded="xl"
              className="border border-purple-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">
                  {post.creator.name}
                </p>
                {post.creator.isVerified && (
                  <CheckBadgeIcon className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm">@{post.creator.username}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Wallet Connect */}
          {!connected && (
            <div className="mb-6">
              <div className="flex justify-center">
                <WalletMultiButton />
              </div>
            </div>
          )}
          
          {/* Post Title */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {post.title}
            </h3>
            <div className="flex items-center gap-2 text-slate-400">
              <LockClosedIcon className="w-5 h-5" />
              <span className="text-sm">Платный контент</span>
            </div>
          </div>

          {/* Price */}
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 text-center">
            <p className="text-slate-400 text-sm mb-2">Стоимость контента</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-white">
                {post.price}
              </span>
              <span className="text-xl text-purple-400 font-semibold">
                {post.currency}
              </span>
            </div>
            
            {/* Payment Distribution */}
            {connected && (
              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <p>Создатель: {formatSolAmount(post.price * 0.9)}</p>
                <p>Платформа: {formatSolAmount(post.price * (creatorData?.referrerId ? 0.05 : 0.1))}</p>
                {creatorData?.referrerId && (
                  <p>Реферер: {formatSolAmount(post.price * 0.05)}</p>
                )}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Мгновенный доступ</p>
                <p className="text-slate-400 text-sm">Получите доступ к контенту сразу после оплаты</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Пожизненный доступ</p>
                <p className="text-slate-400 text-sm">Контент останется доступным навсегда</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Безопасная оплата</p>
                <p className="text-slate-400 text-sm">Транзакция через блокчейн Solana</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePurchase}
              disabled={isProcessing || !connected}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Обработка...
                </>
              ) : !connected ? (
                'Подключите кошелек'
              ) : (
                <>
                  <ShoppingCartIcon className="w-5 h-5" />
                  Купить за {post.price} {post.currency}
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-4 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl hover:bg-slate-700/50 transition-all font-semibold"
            >
              Отмена
            </button>
          </div>

          <p className="mt-4 text-slate-400 text-center text-xs">
            Нажимая "Купить", вы соглашаетесь с условиями покупки цифрового контента
          </p>
        </div>
      </div>
    </div>
  )
} 