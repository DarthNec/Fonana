'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { connection } from '@/lib/solana/connection'
import { 
  XMarkIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import Avatar from './Avatar'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { 
  createPostPurchaseTransaction, 
  calculatePaymentDistribution,
  formatSolAmount 
} from '@/lib/solana/payments'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { jwtManager } from '@/lib/utils/jwt'
import { useUser } from '@/lib/store/appStore'
import { safeToFixed, formatSolToUsd } from '@/lib/utils/format'
import { useRetry } from '@/lib/utils/retry'

// Константа для базовой комиссии сети Solana (5000 lamports = 0.000005 SOL)
const NETWORK_FEE = 0.000005

interface SellablePostModalProps {
  isOpen: boolean
  onClose: () => void
  post: {
    id: string | number
    title: string
    price?: number
    currency?: string
    sellType?: 'FIXED_PRICE' | 'AUCTION'
    quantity?: number  // Количество товара
    auctionStartPrice?: number
    auctionCurrentBid?: number
    auctionEndAt?: string
    creator: {
      id: string
      name: string
      username: string
      avatar: string | null
      isVerified: boolean
    }
  }
}

export default function SellablePostModal({ isOpen, onClose, post }: SellablePostModalProps) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const user = useUser()
  const [isProcessing, setIsProcessing] = useState(false)
  const { retryWithToast } = useRetry()
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const { rate: solToUsdRate = 135, isLoading: isRateLoading } = useSolRate()
  
  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: предотвращаем React Error #185
  if (!user) {
    return null
  }
  
  const price = Number(post.price) || 0
  const currency = post.currency || 'SOL'
  const quantity = post.quantity || 1
  
  const isAuction = post.sellType === 'AUCTION'

  // КРИТИЧЕСКИ БЕЗОПАСНОЕ получение цены с множественными проверками
  const getPrice = () => {
    try {
      if (isAuction) {
        // Для аукциона: берем текущую ставку или стартовую цену
        const currentBid = post.auctionCurrentBid
        const startPrice = post.auctionStartPrice
        
        if (currentBid !== undefined && currentBid !== null) {
          const bidValue = Number(currentBid)
          if (Number.isFinite(bidValue) && bidValue > 0) {
            return bidValue
          }
        }
        
        if (startPrice !== undefined && startPrice !== null) {
          const startValue = Number(startPrice)
          if (Number.isFinite(startValue) && startValue > 0) {
            return startValue
          }
        }
        
        console.warn('[SellablePostModal] Auction has no valid prices:', { currentBid, startPrice })
        return 0.001 // Минимальная цена для аукциона
      }
      
      // Для обычной покупки: берем цену поста
      const postPrice = post.price
      if (postPrice !== undefined && postPrice !== null) {
        const priceValue = Number(postPrice)
        if (Number.isFinite(priceValue) && priceValue > 0) {
          return priceValue
        }
      }
      
      console.warn('[SellablePostModal] Post has no valid price:', { price: post.price })
      return 0.001 // Минимальная цена для покупки
      
    } catch (error) {
      console.error('[SellablePostModal] Error getting price:', error, 'post:', post)
      return 0.001 // Fallback на минимальную цену
    }
  }
  
  const currentPrice = getPrice()
  
  // КРИТИЧЕСКАЯ ФИНАЛЬНАЯ ПРОВЕРКА: убедимся что цена ВСЕГДА валидна
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    console.error('[SellablePostModal] CRITICAL: Invalid currentPrice detected after getPrice():', {
      currentPrice,
      type: typeof currentPrice,
      isFinite: Number.isFinite(currentPrice),
      post: {
        id: post.id,
        title: post.title,
        price: post.price,
        sellType: post.sellType,
        auctionCurrentBid: post.auctionCurrentBid,
        auctionStartPrice: post.auctionStartPrice
      }
    })
  }
  const bidStep = 0.01 // Фиксированный шаг для аукциона
  const minBid = currentPrice + bidStep
  
  // Динамическая комиссия сети
  const dynamicNetworkFee = currentPrice > 1 
    ? NETWORK_FEE * 2 // Увеличенная комиссия для больших сумм
    : NETWORK_FEE

  // Обновляем таймер для аукциона
  useEffect(() => {
    if (!isOpen || post.sellType !== 'AUCTION' || !post.auctionEndAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const end = new Date(post.auctionEndAt!).getTime()
      const difference = end - now

      if (difference <= 0) {
        setTimeLeft('Auction ended')
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      let timeString = ''
      if (hours > 0) timeString += `${hours}h `
      if (minutes > 0 || hours > 0) timeString += `${minutes}m `
      timeString += `${seconds}s`

      setTimeLeft(timeString)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isOpen, post.sellType, post.auctionEndAt])

  const handleBuyNow = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    setIsProcessing(true)
    
    try {
      // Check that it's not the platform wallet
      const PLATFORM_WALLET = 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw'
      if (publicKey.toBase58() === PLATFORM_WALLET) {
        toast.error('❌ You cannot buy from the platform wallet!')
        return
      }

      // Get full creator data with retry
      const creatorData = await retryWithToast(
        async () => {
          const creatorResponse = await fetch(`/api/creators/${post.creator.id}`)
          const data = await creatorResponse.json()
          
          if (!data.creator) {
            throw new Error('Creator not found')
          }
          
          return data
        },
        { maxAttempts: 2, baseDelay: 1000 },
        'FetchCreator'
      )

      if (!creatorData) return // Ошибка уже обработана в retryWithToast

      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }

      // Check that creator is not buying from themselves
      if (creatorWallet === publicKey.toBase58()) {
        toast.error('You cannot buy your own post')
        return
      }

      // Determine referrer presence
      const referrerWallet = creatorData.creator.referrer?.solanaWallet || creatorData.creator.referrer?.wallet
      const hasReferrer = creatorData.creator.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet)

      // КРИТИЧЕСКАЯ МУЛЬТИУРОВНЕВАЯ ВАЛИДАЦИЯ: проверяем сумму перед передачей в платежные функции
      
      // Уровень 1: Проверка currentPrice
      if (currentPrice === undefined || currentPrice === null) {
        console.error('[SellablePostModal] CRITICAL: currentPrice is null/undefined:', {
          currentPrice,
          type: typeof currentPrice,
          postId: post.id,
          postTitle: post.title
        })
        toast.error("Критическая ошибка: цена поста не определена")
        return
      }
      
      // Уровень 2: Конвертация в число с дополнительными проверками
      let cleanAmount: number
      try {
        cleanAmount = Number(currentPrice)
        
        // Проверяем результат конвертации
        if (cleanAmount === undefined || cleanAmount === null) {
          throw new Error(`Number() returned ${cleanAmount}`)
        }
        
        // Проверяем на NaN
        if (Number.isNaN(cleanAmount)) {
          throw new Error(`Number() returned NaN from ${currentPrice}`)
        }
        
        // Проверяем на конечность
        if (!Number.isFinite(cleanAmount)) {
          throw new Error(`Number() returned infinite value from ${currentPrice}`)
        }
        
        // Проверяем что это положительное число
        if (cleanAmount <= 0) {
          throw new Error(`Number() returned non-positive value: ${cleanAmount}`)
        }
        
      } catch (conversionError) {
        console.error('[SellablePostModal] CRITICAL: Number conversion failed:', {
          error: conversionError,
          currentPrice,
          type: typeof currentPrice,
          postId: post.id,
          postPrice: post.price,
          auctionCurrentBid: post.auctionCurrentBid,
          auctionStartPrice: post.auctionStartPrice
        })
        toast.error("Критическая ошибка конвертации цены. Перезагрузите страницу.")
        return
      }
      
      // Уровень 3: Финальная валидация cleanAmount
      console.log('[SellablePostModal] Payment validation passed:', {
        currentPrice,
        cleanAmount,
        type: typeof cleanAmount,
        isFinite: Number.isFinite(cleanAmount),
        isNaN: Number.isNaN(cleanAmount),
        postTitle: post.title
      })
      
      // Проверка минимальной суммы
      if (cleanAmount < 0.001) {
        console.error('[SellablePostModal] Amount too small:', cleanAmount)
        toast.error("Минимальная сумма: 0.001 SOL")
        return
      }

      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        cleanAmount,
        creatorWallet,
        hasReferrer,
        referrerWallet
      )

      // Check connection before creating transaction
      try {
        const slot = await connection.getSlot()
        console.log('[SellablePostModal] Current slot:', slot)
      } catch (err) {
        console.error('[SellablePostModal] Connection error:', err)
        toast.error('Connection error. Please try again.')
        return
      }
      
      // Create transaction
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      // Send transaction
      let signature: string = ''
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 5
      }
      
      // Get fresh blockhash right before sending
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
      
      signature = await sendTransaction(transaction, connection, sendOptions)
      console.log('[SellablePostModal] Transaction sent:', signature)
      
      toast.loading('Waiting for blockchain confirmation...')
      
      // Give transaction time to propagate through the network
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Wait for transaction confirmation
      let confirmed = false
      const maxRetries = 60
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          const status = await connection.getSignatureStatus(signature)
          
          // Log status every 5 attempts
          if (i % 5 === 0) {
            console.log(`[SellablePostModal] Attempt ${i + 1}/${maxRetries} - Status:`, {
              confirmationStatus: status.value?.confirmationStatus,
              err: status.value?.err,
              slot: status.context.slot
            })
          }
          
          if (status.value?.confirmationStatus === 'confirmed' || 
              status.value?.confirmationStatus === 'finalized') {
            console.log(`[SellablePostModal] Transaction confirmed after ${i + 1} attempts`)
            confirmed = true
            break
          }
          
          if (status.value?.err) {
            console.error('[SellablePostModal] Transaction failed:', status.value.err)
            throw new Error('Transaction failed on blockchain')
          }
          
          // If transaction not found yet, wait longer
          if (!status.value && i < 20) {
            console.log(`[SellablePostModal] Transaction not found yet, waiting... (attempt ${i + 1})`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
          
          // If not confirmed yet, wait
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error('Error checking transaction status:', error)
          // Continue checking
        }
      }
      
      if (!confirmed) {
        throw new Error('Transaction not confirmed after 60 seconds')
      }

      // Process payment on backend with retry
      const jwtToken = await jwtManager.getToken()
      if (!jwtToken) {
        throw new Error('Not authenticated')
      }

      const data = await retryWithToast(
        async () => {
          const response = await fetch(`/api/posts/${post.id}/buy`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
              buyerWallet: publicKey.toString(),
              txSignature: signature,
              price: currentPrice,
              hasReferrer,
              distribution
            })
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Error processing payment')
          }

          return result
        },
        { maxAttempts: 2, baseDelay: 1000 },
        'ProcessPayment'
      )

      if (!data) return // Ошибка уже обработана в retryWithToast
      
      toast.success(`Successfully bought the post!`)
      
      // Отправляем событие о покупке поста
      window.dispatchEvent(new CustomEvent('post-purchased', { 
        detail: { 
          postId: post.id,
          purchased: true
        } 
      }))
      
      onClose()
    } catch (error) {
      console.error('Error buying post:', error)
      
      let errorMessage = 'Error processing purchase'
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'You cancelled the transaction'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient funds in wallet'
        } else if (error.message.includes('Transaction not confirmed')) {
          errorMessage = 'Transaction was not confirmed. Please try again'
        } else if (error.message.includes('block height exceeded')) {
          errorMessage = 'Transaction expired. Please try again'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlaceBid = async () => {
    if (!connected || !publicKey) {
      toast.error('Подключите кошелек')
      return
    }

    const bid = parseFloat(bidAmount)
    if (!bid || bid <= 0) {
      toast.error('Введите корректную ставку')
      return
    }

    if (bid < minBid) {
      toast.error(`Минимальная ставка: ${safeToFixed(minBid, 2)} SOL`)
      return
    }

    toast.error('Auctions will be available in the next update')
    // TODO: Implement auction bidding
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isAuction ? '🕒 Participate in the auction' : '🛒 Buy Post'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Post Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {post.title}
            </h3>
            
            {/* Creator */}
            <div className="flex items-center gap-3">
              <Avatar
                src={post.creator.avatar}
                alt={post.creator.name}
                seed={post.creator.username}
                size={40}
                rounded="xl"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {post.creator.name}
                  </span>
                  {post.creator.isVerified && (
                    <CheckIcon className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  @{post.creator.username}
                </span>
              </div>
            </div>
          </div>

          {/* Price Info */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-6 mb-6">
            <div className="text-center">
              {isAuction ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                    Current bid
                  </div>
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                    {safeToFixed(currentPrice, 2)} SOL
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    {formatSolToUsd(currentPrice, solToUsdRate)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">
                    + Network fee: ~{safeToFixed(dynamicNetworkFee, 6)} SOL
                  </div>
                  {post.auctionEndAt && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-slate-400 mt-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>Time left: {timeLeft}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                    * Network fee applies to each bid
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-purple-600 dark:text-purple-300">Курс SOL/USD: {isRateLoading ? '...' : `$${safeToFixed(solToUsdRate, 2)}`}</span>
                    <span className="text-xs text-gray-400">(курс обновляется автоматически)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                    Price breakdown
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Item price:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {safeToFixed(currentPrice, 2)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Network fee:</span>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        ~{safeToFixed(dynamicNetworkFee, 6)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-slate-400">In USD:</span>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        {formatSolToUsd(currentPrice, solToUsdRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-yellow-500/20">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {safeToFixed((Number(currentPrice) || 0) + (Number(dynamicNetworkFee) || 0), 6)} SOL
                      </span>
                    </div>
                  </div>
                  {quantity > 1 && (
                    <div className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                      📦 {quantity} items available
                    </div>
                  )}
                  {dynamicNetworkFee > NETWORK_FEE && (
                    <div className="text-xs text-gray-500 dark:text-slate-500 mt-2 text-center">
                      * Using priority fee for faster confirmation
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          {isAuction ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Your bid (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={safeToFixed(Number(currentPrice) + 0.1, 2)}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Minimum ${safeToFixed(Number(currentPrice) + 0.1, 2)}`}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handlePlaceBid}
                disabled={isProcessing || !connected}
                className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CurrencyDollarIcon className="w-5 h-5" />
                    Place bid
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleBuyNow}
              disabled={isProcessing || !connected}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing payment...
                </>
              ) : (
                <>
                  <CurrencyDollarIcon className="w-5 h-5" />
                  Buy for {safeToFixed((Number(currentPrice) || 0) + (Number(dynamicNetworkFee) || 0), 4)} {currency}
                </>
              )}
            </button>
          )}

          {!connected && (
            <p className="text-center text-sm text-red-600 dark:text-red-400 mt-4">
              Connect your wallet to continue
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 