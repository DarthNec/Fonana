'use client'

import { useState } from 'react'
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useConnection } from '@solana/wallet-adapter-react'
import { createTipTransaction, formatSolAmount } from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { jwtManager } from '@/lib/utils/jwt'
import { useSolRate } from '@/lib/hooks/useSolRate'
import { safeToFixed } from '@/lib/utils/format'
import toast from 'react-hot-toast'

interface TipSendModalProps {
  isOpen: boolean
  onClose: () => void
  creatorId: string
  creatorName?: string
}

export function TipSendModal({ isOpen, onClose, creatorId, creatorName }: TipSendModalProps) {
  const [tipAmountUSD, setTipAmountUSD] = useState(5) // Начинаем с $5
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { rate: solRate } = useSolRate()
  const publicKeyString = publicKey?.toBase58() ?? null

  if (!isOpen) return null

  // Конвертируем USD в SOL
  const tipAmountSOL = solRate > 0 ? tipAmountUSD / solRate : 0

  const handleIncrease = () => {
    setTipAmountUSD(prev => prev + 5)
  }

  const handleDecrease = () => {
    if (tipAmountUSD > 5) {
      setTipAmountUSD(prev => prev - 5)
    }
  }

  const handleSendTip = async () => {
    if (!publicKeyString || tipAmountSOL <= 0 || isSending) return

    setIsSending(true)
    
    try {
      // Получаем данные создателя
      const creatorResponse = await fetch(`/api/creators/${creatorId}`)
      const creatorData = await creatorResponse.json()
      
      if (!creatorData.creator) {
        throw new Error('Failed to load creator data')
      }
      
      const creatorWallet = creatorData.creator.solanaWallet || creatorData.creator.wallet
      
      if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
        toast.error('Creator wallet not configured')
        return
      }

      if (!publicKey) {
        throw new Error('Public key is not available')
      }
      
      // Создаем транзакцию
      const transaction = await createTipTransaction(
        publicKey,
        creatorWallet,
        tipAmountSOL
      )
      
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }
      
      // Отправляем транзакцию
      const signature = await sendTransaction(transaction, connection, sendOptions)
      
      toast.loading('Waiting for blockchain confirmation...')
      await new Promise(resolve => setTimeout(resolve, 10000))

      // Отправляем данные на бэкенд
      const token = await jwtManager.getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorId: creatorId,
          amount: tipAmountSOL,
          txSignature: signature,
          message: message || undefined
        })
      })

      if (response.ok) {
        toast.success(`Tip sent!`)
        onClose()
        // Сбрасываем значения
        setTipAmountUSD(5)
        setMessage('')
      } else {
        const error = await response.json()
        console.error('Backend error:', error)
        toast.error(error.error || 'Failed to send tip')
      }
    } catch (error: any) {
      console.error('Error sending tip:', error)
      
      let errorMessage = 'Failed to send tip'
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled'
      } else if (error.message?.includes('Insufficient')) {
        errorMessage = 'Insufficient SOL balance'
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error, please try again'
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        // Закрываем при клике на overlay (не на модалку)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700/50 animate-slideInUp">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-slate-700/50 py-6 px-8">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent text-center">
            Send a tip?
          </h2>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Amount Controls */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <button
              onClick={handleDecrease}
              disabled={tipAmountUSD <= 5}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-700"
            >
              <MinusIcon className="w-8 h-8 text-gray-700 dark:text-white" />
            </button>

            <div className="text-center">
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                ${tipAmountUSD.toFixed(2)}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                {parseFloat(safeToFixed(tipAmountSOL, 3))} SOL
              </div>
            </div>

            <button
              onClick={handleIncrease}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
            >
              <PlusIcon className="w-8 h-8 text-gray-700 dark:text-white" />
            </button>
          </div>

          {/* Message Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message..."
            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-200 dark:border-slate-700 mb-6"
            rows={3}
          />

          {/* Send Button */}
          <button
            onClick={handleSendTip}
            disabled={isSending || !publicKeyString || tipAmountSOL <= 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg rounded-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
          >
            {isSending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send tip
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

