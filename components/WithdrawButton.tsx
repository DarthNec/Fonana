'use client'

import React, { useState } from 'react'
import { CurrencyDollarIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { useSolRate } from '@/lib/hooks/useSolRate'

interface WithdrawButtonProps {
  balance: number // Current balance in SOL
  onWithdraw?: () => void
}

export default function WithdrawButton({ balance, onWithdraw }: WithdrawButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { publicKey, sendTransaction } = useWallet()
  const { user } = useUser()
  const { rate: solRate } = useSolRate()

  const handleWithdraw = async () => {
    if (!publicKey || !user?.wallet) {
      toast.error('Кошелек не подключен')
      return
    }

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Введите корректную сумму')
      return
    }

    if (withdrawAmount > balance) {
      toast.error('Недостаточно средств')
      return
    }

    // Minimum withdrawal amount
    const MIN_WITHDRAWAL = 0.1 // SOL
    if (withdrawAmount < MIN_WITHDRAWAL) {
      toast.error(`Минимальная сумма вывода: ${MIN_WITHDRAWAL} SOL`)
      return
    }

    try {
      setIsProcessing(true)

      // Create withdrawal transaction
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
      
      // Platform wallet that holds the funds
      const platformWallet = new PublicKey('npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4')
      
      // Create transaction to send funds from platform to user
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet,
          toPubkey: publicKey,
          lamports: withdrawAmount * LAMPORTS_PER_SOL,
        })
      )

      // This would need server-side signing with platform private key
      // For now, we'll just show the UI and log the withdrawal request
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: withdrawAmount,
          toWallet: publicKey.toString()
        })
      })

      if (!response.ok) {
        throw new Error('Ошибка обработки вывода')
      }

      toast.success(`Запрос на вывод ${withdrawAmount} SOL отправлен`)
      setIsOpen(false)
      setAmount('')
      onWithdraw?.()

    } catch (error) {
      console.error('Withdrawal error:', error)
      toast.error('Ошибка при выводе средств')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-6 py-3 font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 flex items-center gap-2"
      >
        <BanknotesIcon className="w-5 h-5" />
        <span>Вывести средства</span>
      </button>

      {/* Withdrawal Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Вывод средств
            </h3>

            <div className="space-y-4">
              {/* Balance Display */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Доступный баланс</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {balance.toFixed(4)} SOL
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-500">
                  ≈ ${(balance * solRate).toFixed(2)} USD
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Сумма вывода (SOL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                    min="0.1"
                    max={balance}
                    className="w-full px-4 py-2 pr-20 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 dark:text-slate-400 text-sm">SOL</span>
                  </div>
                </div>
                {amount && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                    ≈ ${(parseFloat(amount) * solRate).toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Withdrawal Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  • Минимальная сумма: 0.1 SOL<br/>
                  • Комиссия сети: ~0.00025 SOL<br/>
                  • Время обработки: до 24 часов
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Обработка...</span>
                    </>
                  ) : (
                    <>
                      <CurrencyDollarIcon className="w-5 h-5" />
                      <span>Вывести</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 