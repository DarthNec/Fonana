'use client'

import { PricingProvider, usePricing } from '@/lib/pricing/PricingProvider'
import { useDynamicPrice, formatSolAmount, formatUsdAmount } from '@/lib/pricing/hooks/useDynamicPrice'
import { useSolanaRate } from '@/lib/pricing/hooks/usePriceDisplay'
import { useState } from 'react'
import Link from 'next/link'
import { UserSelector } from '@/components/UserSelector'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { SOLANA_CONFIG } from '@/lib/solana/config'
import { WalletProvider } from '@/components/WalletProvider'

interface User {
  id: string
  nickname: string
  fullName: string | null
  wallet: string | null
  isCreator: boolean
  postsCount: number
  subscribersCount: number
  referrer: {
    id: string
    nickname: string
    wallet: string | null
  } | null
  isCurrent?: boolean
}

function PricingDashboard() {
  const { prices, isLoading, error, lastUpdate, refresh } = usePricing()
  const solanaRate = useSolanaRate()
  const [testAmount, setTestAmount] = useState(0.1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { publicKey, sendTransaction } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionResult, setTransactionResult] = useState<any>(null)
  
  // Тестовые цены
  const testPrices = [0.01, 0.05, 0.1, 0.5, 1, 5, 10]

  // Функция отправки тестовой транзакции
  const sendTestTransaction = async (amount: number) => {
    if (!publicKey || !selectedUser?.wallet) {
      alert('Подключите кошелек и выберите получателя')
      return
    }

    setIsProcessing(true)
    setTransactionResult(null)

    try {
      const connection = new Connection(SOLANA_CONFIG.RPC_HOST, 'confirmed')
      const recipientPubkey = new PublicKey(selectedUser.wallet)
      const platformPubkey = new PublicKey(SOLANA_CONFIG.PLATFORM_WALLET)
      
      // Рассчитываем распределение
      const totalAmount = amount * LAMPORTS_PER_SOL
      const platformFee = Math.floor(totalAmount * 0.05) // 5% платформе
      const referrerFee = selectedUser.referrer?.wallet ? Math.floor(totalAmount * 0.05) : 0 // 5% рефереру
      const creatorAmount = totalAmount - platformFee - referrerFee

      // Получаем рекомендуемую приоритетную комиссию
      const getPriorityFee = async (): Promise<number> => {
        try {
          const fees = await connection.getRecentPrioritizationFees()
          if (fees && fees.length > 0) {
            const nonZeroFees = fees.filter(f => f.prioritizationFee > 0)
            if (nonZeroFees.length > 0) {
              const feeValues = nonZeroFees.map(f => f.prioritizationFee).sort((a, b) => a - b)
              const p90 = feeValues[Math.floor(feeValues.length * 0.9)]
              return Math.min(Math.max(p90 || 600000, 600000), 2000000)
            }
          }
        } catch (error) {
          console.error('Error getting priority fees:', error)
        }
        return 600000 // По умолчанию
      }

      // Проверяем существование аккаунтов и нужна ли рента
      const getAccountRentIfNeeded = async (pubkey: PublicKey): Promise<number> => {
        try {
          const accountInfo = await connection.getAccountInfo(pubkey)
          if (!accountInfo) {
            const minRent = await connection.getMinimumBalanceForRentExemption(0)
            console.log(`Account ${pubkey.toBase58()} needs rent: ${minRent / LAMPORTS_PER_SOL} SOL`)
            return minRent
          }
        } catch (error) {
          console.error('Error checking account:', error)
        }
        return 0
      }

      // Создаем транзакцию с учетом priority fee и rent
      const createTransaction = async () => {
        // Получаем свежий blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        
        const transaction = new Transaction()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey
        ;(transaction as any).lastValidBlockHeight = lastValidBlockHeight

        // Добавляем приоритетную комиссию
        const priorityFee = await getPriorityFee()
        console.log(`Using priority fee: ${priorityFee} microlamports`)
        
        const { ComputeBudgetProgram } = await import('@solana/web3.js')
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
          })
        )

        // 1. Платеж создателю с учетом ренты
        const creatorRent = await getAccountRentIfNeeded(recipientPubkey)
        const creatorTransferAmount = creatorAmount + creatorRent
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubkey,
            lamports: creatorTransferAmount
          })
        )
        
        // 2. Комиссия платформе
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: platformPubkey,
            lamports: platformFee
          })
        )
        
        // 3. Комиссия рефереру (если есть)
        if (selectedUser.referrer?.wallet && referrerFee > 0) {
          const referrerPubkey = new PublicKey(selectedUser.referrer.wallet)
          const referrerRent = await getAccountRentIfNeeded(referrerPubkey)
          const referrerTransferAmount = referrerFee + referrerRent
          
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: referrerPubkey,
              lamports: referrerTransferAmount
            })
          )
        }

        return transaction
      }

      // Параметры для отправки транзакции
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed' as any,
        maxRetries: 3
      }

      // Отправляем транзакцию с retry логикой
      let signature: string = ''
      let attempts = 0
      const maxAttempts = 3
      
      while (attempts < maxAttempts) {
        attempts++
        
        try {
          // Создаем новую транзакцию с свежим blockhash для каждой попытки
          const transaction = await createTransaction()
          
          // Симулируем транзакцию перед отправкой
          try {
            const simulation = await connection.simulateTransaction(transaction)
            
            if (simulation.value.err) {
              console.error('Simulation failed:', simulation.value.err)
              if (simulation.value.err !== 'AccountNotFound') {
                throw new Error(`Симуляция транзакции неуспешна: ${JSON.stringify(simulation.value.err)}`)
              }
            }
          } catch (simError) {
            console.warn('Simulation error (continuing):', simError)
          }
          
          signature = await sendTransaction(transaction, connection, sendOptions)
          console.log('Transaction sent:', signature)
          
          // Успешно отправлено, выходим из цикла
          break
          
        } catch (sendError) {
          console.error(`Attempt ${attempts} failed:`, sendError)
          
          if (attempts === maxAttempts) {
            throw new Error(`Не удалось отправить транзакцию после ${maxAttempts} попыток: ${sendError instanceof Error ? sendError.message : 'Неизвестная ошибка'}`)
          }
          
          // Ждем перед следующей попыткой
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Ждем подтверждения с правильным таймаутом
      console.log('Waiting for confirmation...')
      
      try {
        // Используем confirmTransaction с правильными параметрами
        const latestBlockhash = await connection.getLatestBlockhash('confirmed')
        
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        }, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }
        
        console.log('Transaction confirmed:', signature)
        
      } catch (confirmError) {
        console.error('Confirmation error:', confirmError)
        
        // Проверяем статус транзакции даже если подтверждение истекло
        const status = await connection.getSignatureStatus(signature)
        
        if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
          console.log('Transaction was actually confirmed despite timeout')
        } else if (status.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`)
        } else {
          throw new Error('Transaction status unknown after timeout')
        }
      }
      
      setTransactionResult({
        signature,
        amount,
        recipient: selectedUser.nickname,
        creatorAmount: creatorAmount / LAMPORTS_PER_SOL,
        platformFee: platformFee / LAMPORTS_PER_SOL,
        referrerFee: referrerFee / LAMPORTS_PER_SOL,
        referrer: selectedUser.referrer?.nickname,
        status: 'success'
      })

    } catch (error: any) {
      console.error('Transaction error:', error)
      
      let errorMessage = error.message || 'Transaction failed'
      
      // Обработка специфичных ошибок
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Вы отменили транзакцию'
      } else if (errorMessage.includes('insufficient')) {
        errorMessage = 'Недостаточно средств на кошельке (включая комиссию сети)'
      } else if (errorMessage.includes('blockhash not found')) {
        errorMessage = 'Транзакция истекла. Попробуйте еще раз'
      }
      
      setTransactionResult({
        status: 'error',
        error: errorMessage
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Тестирование динамического курса
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Изолированная система для тестирования динамических цен и транзакций
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Подключение кошелька</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Платформа: {SOLANA_CONFIG.PLATFORM_WALLET.slice(0, 8)}...{SOLANA_CONFIG.PLATFORM_WALLET.slice(-6)}
              </p>
            </div>
            <WalletMultiButton />
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Статус системы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Курс SOL/USD</p>
              <p className="text-2xl font-bold">
                {isLoading && !prices ? (
                  <span className="animate-pulse">Загрузка...</span>
                ) : (
                  solanaRate.display || 'Недоступно'
                )}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Источник</p>
              <p className="text-lg font-semibold">
                {prices?.source || 'N/A'}
                {prices?.isStale && ' (устарел)'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Последнее обновление</p>
              <p className="text-lg font-semibold">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Никогда'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              Ошибка: {error}
            </div>
          )}

          <button
            onClick={refresh}
            disabled={isLoading}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Обновление...' : 'Обновить курс'}
          </button>
        </div>

        {/* User Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Выбор получателя платежа</h2>
          <UserSelector 
            onUserSelect={setSelectedUser} 
            selectedUser={selectedUser}
          />
          
          {selectedUser && (
            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="font-semibold mb-2">Выбранный получатель:</p>
              <div className="space-y-1 text-sm">
                <p>Пользователь: <span className="font-medium">{selectedUser.nickname}</span></p>
                <p>Кошелек: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {selectedUser.wallet || 'Не указан'}
                </code></p>
                {selectedUser.referrer && (
                  <p>Реферер: <span className="font-medium">{selectedUser.referrer.nickname}</span>
                    {selectedUser.referrer.wallet && (
                      <code className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                        {selectedUser.referrer.wallet.slice(0, 8)}...
                      </code>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Test Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Тестовые транзакции</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Сумма транзакции (SOL)</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0.001"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <PaymentBreakdown 
            amount={testAmount} 
            hasReferrer={!!selectedUser?.referrer?.wallet}
          />
          
          <button
            onClick={() => sendTestTransaction(testAmount)}
            disabled={!publicKey || !selectedUser?.wallet || isProcessing}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isProcessing ? 'Обработка...' : `Отправить ${formatSolAmount(testAmount)}`}
          </button>
        </div>

        {/* Transaction Result */}
        {transactionResult && (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 ${
            transactionResult.status === 'success' ? 'ring-2 ring-green-500' : 'ring-2 ring-red-500'
          }`}>
            <h3 className="text-lg font-semibold mb-4">
              {transactionResult.status === 'success' ? '✅ Транзакция успешна!' : '❌ Ошибка транзакции'}
            </h3>
            
            {transactionResult.status === 'success' ? (
              <div className="space-y-2">
                <p>Сумма: <span className="font-bold">{formatSolAmount(transactionResult.amount)}</span></p>
                <p>Получатель: <span className="font-bold">{transactionResult.recipient}</span></p>
                <div className="pt-2 border-t">
                  <p>Создателю: {formatSolAmount(transactionResult.creatorAmount)}</p>
                  <p>Платформе: {formatSolAmount(transactionResult.platformFee)}</p>
                  {transactionResult.referrer && (
                    <p>Рефереру ({transactionResult.referrer}): {formatSolAmount(transactionResult.referrerFee)}</p>
                  )}
                </div>
                <p className="pt-2 border-t">
                  Подпись: 
                  <a 
                    href={`https://solscan.io/tx/${transactionResult.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-purple-600 hover:text-purple-700 underline"
                  >
                    {transactionResult.signature.slice(0, 20)}...
                  </a>
                </p>
              </div>
            ) : (
              <p className="text-red-600 dark:text-red-400">{transactionResult.error}</p>
            )}
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Быстрые тесты</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {testPrices.map(price => (
              <button
                key={price}
                onClick={() => {
                  setTestAmount(price)
                  if (publicKey && selectedUser?.wallet) {
                    sendTestTransaction(price)
                  }
                }}
                disabled={!publicKey || !selectedUser?.wallet || isProcessing}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PriceDisplay amount={price} />
              </button>
            ))}
          </div>
        </div>

        {/* Test Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Тестовые страницы</h2>
          
          <div className="space-y-2">
            <Link
              href="/test/pricing/subscription"
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold">Тест подписок</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Проверка отображения цен в модальном окне подписок
              </p>
            </Link>
            
            <Link
              href="/test/pricing/post-purchase"
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <h3 className="font-semibold">Тест покупки постов</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Проверка отображения цен при покупке контента
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentBreakdown({ amount, hasReferrer }: { amount: number; hasReferrer: boolean }) {
  const price = useDynamicPrice(amount)
  const platformFee = amount * 0.05
  const referrerFee = hasReferrer ? amount * 0.05 : 0
  const creatorAmount = amount - platformFee - referrerFee
  
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <p className="font-semibold mb-3">Распределение платежа:</p>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Создателю ({hasReferrer ? '90%' : '95%'}):</span>
          <span className="font-medium">{formatSolAmount(creatorAmount)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Платформе (5%):</span>
          <span className="font-medium">{formatSolAmount(platformFee)}</span>
        </div>
        
        {hasReferrer && (
          <div className="flex justify-between">
            <span>Рефереру (5%):</span>
            <span className="font-medium">{formatSolAmount(referrerFee)}</span>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="flex justify-between font-bold">
            <span>Итого:</span>
            <span>{price.displayPrice}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PriceDisplay({ amount }: { amount: number }) {
  const price = useDynamicPrice(amount)
  
  return (
    <div>
      <p className="text-lg font-bold">{formatSolAmount(amount)}</p>
      {price.usd && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ≈ {formatUsdAmount(price.usd)}
        </p>
      )}
    </div>
  )
}

export default function PricingTestPage() {
  const [enabled, setEnabled] = useState(true)
  
  return (
    <WalletProvider>
      <PricingProvider enabled={enabled}>
        <PricingDashboard />
      </PricingProvider>
    </WalletProvider>
  )
} 