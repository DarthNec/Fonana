'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

// USDC адрес на mainnet
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

interface WalletBalanceState {
  sol: number
  usdc: number
  isLoading: boolean
  error: string | null
}

export function WalletBalance() {
  const { connected, publicKey } = useWallet()
  const [balances, setBalances] = useState<WalletBalanceState>({
    sol: 0,
    usdc: 0,
    isLoading: false,
    error: null
  })

  const connection = new Connection('https://tame-smart-panorama.solana-mainnet.quiknode.pro/0e70fc875702b126bf8b93cdcd626680e9c48894/')

  const fetchBalances = async () => {
    if (!connected || !publicKey) return

    setBalances(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Получаем SOL баланс
      const solBalance = await connection.getBalance(publicKey)
      const solAmount = solBalance / LAMPORTS_PER_SOL

      // Получаем USDC баланс
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      )

      let usdcAmount = 0
      for (const tokenAccount of tokenAccounts.value) {
        const mintAddress = tokenAccount.account.data.parsed.info.mint
        if (mintAddress === USDC_MINT_ADDRESS) {
          const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount
          usdcAmount += balance || 0
        }
      }

      setBalances({
        sol: solAmount,
        usdc: usdcAmount,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching balances:', error)
      setBalances(prev => ({
        ...prev,
        isLoading: false,
        error: 'Ошибка загрузки балансов'
      }))
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [connected, publicKey])

  if (!connected) {
    return (
      <div className="modern-card p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Кошелёк не подключён
          </h3>
          <p className="text-muted">
            Подключите кошелёк для просмотра баланса
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="modern-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Баланс кошелька
        </h2>
        <button
          onClick={fetchBalances}
          disabled={balances.isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowPathIcon className={`w-5 h-5 ${balances.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {balances.error ? (
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{balances.error}</p>
          <button
            onClick={fetchBalances}
            className="mt-4 btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SOL Balance */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SOL</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {balances.isLoading ? (
                    <div className="shimmer h-6 w-20 rounded" />
                  ) : (
                    `${balances.sol.toFixed(4)} SOL`
                  )}
                </div>
                <div className="text-sm text-muted">
                  ≈ ${(balances.sol * 98.50).toFixed(2)} USD
                </div>
              </div>
            </div>
            {!balances.isLoading && balances.sol < 0.1 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded">
                Низкий баланс
              </div>
            )}
          </div>

          {/* USDC Balance */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">USDC</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {balances.isLoading ? (
                    <div className="shimmer h-6 w-20 rounded" />
                  ) : (
                    `${balances.usdc.toFixed(2)} USDC`
                  )}
                </div>
                <div className="text-sm text-muted">
                  ≈ ${balances.usdc.toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-muted mb-2">Адрес кошелька:</div>
            <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-700 dark:text-gray-300 break-all">
              {publicKey?.toBase58()}
            </div>
          </div>

          {/* Mainnet Notice */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Mainnet сеть:</strong> Вы работаете с реальными токенами SOL и USDC. Будьте осторожны при проведении транзакций.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 