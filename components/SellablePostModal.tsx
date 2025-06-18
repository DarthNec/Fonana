'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useConnection } from '@solana/wallet-adapter-react'
import { toast } from 'react-hot-toast'
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
  const { connection } = useConnection()
  const { connected, publicKey, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [dynamicNetworkFee, setDynamicNetworkFee] = useState(NETWORK_FEE)
  
  const price = post.price || 0
  const currency = post.currency || 'SOL'
  const quantity = post.quantity || 1
  
  const isAuction = post.sellType === 'AUCTION'



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
      const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'
      if (publicKey.toBase58() === PLATFORM_WALLET) {
        toast.error('❌ You cannot buy from the platform wallet!')
        return
      }

      // Get full creator data
      const creatorResponse = await fetch(`/api/creators/${post.creator.id}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Creator not found')
      }

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

      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        price,
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
      let signature: string = ''
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      // Get fresh blockhash right before sending
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight
      
      signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Waiting for blockchain confirmation...')
      
      // Give transaction time to get into the network
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Process payment on backend
      const response = await fetch(`/api/posts/${post.id}/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-wallet': publicKey.toBase58()
        },
        body: JSON.stringify({
          buyerWallet: publicKey.toString(),
          txSignature: signature,
          price,
          hasReferrer,
          distribution
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error processing payment')
      }
      
      toast.success(`Successfully bought the post!`)
      
      onClose()
      
      // Force page refresh after a small delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
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

    const minBid = (post.auctionCurrentBid || post.auctionStartPrice || 0) + 0.1
    if (bid < minBid) {
      toast.error(`Минимальная ставка: ${minBid.toFixed(2)} SOL`)
      return
    }

    toast.error('Auctions will be available in the next update')
    // TODO: Implement auction bidding
  }

  if (!isOpen) return null

  const currentPrice = isAuction 
    ? (post.auctionCurrentBid || post.auctionStartPrice || 0)
    : price

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
                    {currentPrice.toFixed(2)} SOL
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">
                    + Network fee: ~{dynamicNetworkFee.toFixed(6)} SOL
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
                        {currentPrice.toFixed(2)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Network fee:</span>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        ~{dynamicNetworkFee.toFixed(6)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-yellow-500/20">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {(currentPrice + dynamicNetworkFee).toFixed(6)} SOL
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
                  min={(currentPrice + 0.1).toFixed(2)}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Minimum ${(currentPrice + 0.1).toFixed(2)}`}
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
                  Buy for {(currentPrice + dynamicNetworkFee).toFixed(4)} {currency}
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