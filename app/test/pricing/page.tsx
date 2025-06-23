'use client'

import { PricingProvider, usePricing } from '@/lib/pricing/PricingProvider'
import { useDynamicPrice, formatSolAmount, formatUsdAmount } from '@/lib/pricing/hooks/useDynamicPrice'
import { useSolanaRate } from '@/lib/pricing/hooks/usePriceDisplay'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserSelector } from '@/components/UserSelector'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { SOLANA_CONFIG } from '@/lib/solana/config'
import { WalletProvider } from '@/components/WalletProvider'
import { toast } from 'react-hot-toast'
import { createPostPurchaseTransaction, calculatePaymentDistribution } from '@/lib/solana/payments'
import { isValidSolanaAddress } from '@/lib/solana/config'
import { connection } from '@/lib/solana/connection'

interface User {
  id: string
  nickname: string
  wallet: string | null
  solanaWallet?: string | null
  referrerId?: string | null
  referrer?: {
    id: string
    nickname: string
    wallet: string | null
    solanaWallet?: string | null
  } | null
}

function PricingDashboard() {
  const { prices, isLoading, error, lastUpdate, refresh } = usePricing()
  const solanaRate = useSolanaRate()
  const [testAmount, setTestAmount] = useState(0.1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { publicKey, sendTransaction, connected } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionResult, setTransactionResult] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  // Загружаем пользователей при монтировании
  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const response = await fetch('/api/admin/users')
        const data = await response.json()
        if (data.users) {
          setUsers(data.users.filter((user: any) => user.wallet))
        }
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [])

  // Тестовые цены
  const testPrices = [0.01, 0.05, 0.1, 0.5, 1, 5, 10]

  const handleSendTransaction = async () => {
    if (!publicKey || !selectedUser || !selectedUser.wallet) {
      toast.error('Пожалуйста, подключите кошелек и выберите получателя с настроенным Solana кошельком')
      return
    }

    const solAmount = parseFloat(testAmount.toString())
    if (isNaN(solAmount) || solAmount <= 0) {
      toast.error('Введите корректную сумму')
      return
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: запрещаем покупки с кошелька платформы
    const PLATFORM_WALLET = 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4'
    if (publicKey.toBase58() === PLATFORM_WALLET) {
      toast.error('❌ Вы не можете покупать контент с кошелька платформы!')
      return
    }

    const creatorWallet = selectedUser.solanaWallet || selectedUser.wallet
    const referrerWallet = selectedUser.referrer?.solanaWallet || selectedUser.referrer?.wallet
    const hasReferrer = !!(selectedUser.referrerId && referrerWallet && isValidSolanaAddress(referrerWallet || ''))

    if (!creatorWallet || !isValidSolanaAddress(creatorWallet)) {
      toast.error('Кошелек создателя не настроен')
      return
    }
    
    // Дополнительная проверка: создатель не может покупать свой контент
    if (creatorWallet === publicKey.toBase58()) {
      toast.error('Вы не можете покупать свой собственный контент')
      return
    }

    setIsProcessing(true)

    try {
      // Calculate payment distribution
      const distribution = calculatePaymentDistribution(
        solAmount,
        creatorWallet,
        hasReferrer,
        referrerWallet || undefined
      )

      // Create transaction
      const transaction = await createPostPurchaseTransaction(
        publicKey,
        distribution
      )

      // Проверяем что feePayer установлен правильно
      if (transaction.feePayer?.toBase58() !== publicKey.toBase58()) {
        console.error('CRITICAL: Fee payer mismatch!', {
          transactionFeePayer: transaction.feePayer?.toBase58(),
          userPublicKey: publicKey.toBase58()
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

      // Success!
      toast.success('Транзакция успешно отправлена!')
      
      setTransactionResult({
        signature,
        solAmount,
        usdAmount: solAmount * (prices?.SOL_USD || 135), // Используем динамический курс!
        recipientWallet: creatorWallet,
        platformFee: distribution.platformAmount,
        referrerFee: distribution.referrerAmount || 0,
        creatorReceived: distribution.creatorAmount
      })

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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Выберите получателя
            </h3>
            
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value)
                setSelectedUser(user || null)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Выберите пользователя...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  @{user.nickname} - {user.wallet ? '✓ Wallet' : '✗ No wallet'}
                  {user.referrer && ` (ref: @${user.referrer.nickname})`}
                </option>
              ))}
            </select>
          </div>
          
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
            onClick={handleSendTransaction}
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
                <p>Сумма: <span className="font-bold">{formatSolAmount(transactionResult.solAmount)}</span></p>
                <p>Получатель: <span className="font-bold">{transactionResult.recipientWallet}</span></p>
                <div className="pt-2 border-t">
                  <p>Создателю: {formatSolAmount(transactionResult.creatorReceived)}</p>
                  <p>Платформе: {formatSolAmount(transactionResult.platformFee)}</p>
                  {transactionResult.referrerFee > 0 && (
                    <p>Рефереру: {formatSolAmount(transactionResult.referrerFee)}</p>
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
                    handleSendTransaction()
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