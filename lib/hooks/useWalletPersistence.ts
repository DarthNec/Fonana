'use client'

import { useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { cacheManager } from '@/lib/services/CacheManager'

const WALLET_PERSISTENCE_KEY = 'fonana_wallet_persistence'

export function useWalletPersistence() {
  const { connected, wallet, publicKey, connecting, select, connect } = useWallet()
  if (typeof window === 'undefined') {
    console.error('[SSR Guard] useWallet() called on server (useWalletPersistence)')
  }

  // Сохраняем состояние подключения при изменении
  useEffect(() => {
    if (connected && wallet && publicKey) {
      const persistenceData = {
        walletName: wallet.adapter.name,
        publicKey: publicKey.toString(),
        timestamp: Date.now()
      }
      cacheManager.set(WALLET_PERSISTENCE_KEY, JSON.stringify(persistenceData), 7 * 24 * 60 * 60 * 1000) // 7 дней
    }
  }, [connected, wallet, publicKey])

  // Пытаемся восстановить подключение при загрузке
  useEffect(() => {
    const restoreConnection = async () => {
      try {
        const savedData = cacheManager.get(WALLET_PERSISTENCE_KEY)
        if (!savedData || typeof savedData !== 'string') return

        const { walletName, timestamp } = JSON.parse(savedData)
        
        // Проверяем, не истекла ли сессия (7 дней)
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - timestamp > sevenDays) {
          cacheManager.delete(WALLET_PERSISTENCE_KEY)
          return
        }

        // Если уже подключены или в процессе подключения, ничего не делаем
        if (connected || connecting) return

        // Пытаемся выбрать и подключить сохраненный кошелек
        if (walletName) {
          console.log(`Attempting to restore wallet connection: ${walletName}`)
          await select(walletName)
          // Даем время адаптеру инициализироваться
          setTimeout(async () => {
            try {
              await connect()
            } catch (error) {
              console.error('Failed to restore wallet connection:', error)
              cacheManager.delete(WALLET_PERSISTENCE_KEY)
            }
          }, 100)
        }
      } catch (error) {
        console.error('Error restoring wallet connection:', error)
        cacheManager.delete(WALLET_PERSISTENCE_KEY)
      }
    }

    // Запускаем восстановление только после монтирования компонента
    if (typeof window !== 'undefined') {
      restoreConnection()
    }
  }, []) // Запускаем только один раз при монтировании

  // Очищаем сохраненное состояние при отключении
  useEffect(() => {
    const handleDisconnect = () => {
      if (!connected) {
        cacheManager.delete(WALLET_PERSISTENCE_KEY)
      }
    }

    handleDisconnect()
  }, [connected])

  return {
    clearPersistence: () => {
      cacheManager.delete(WALLET_PERSISTENCE_KEY)
    }
  }
} 