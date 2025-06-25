'use client'

import { useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const WALLET_PERSISTENCE_KEY = 'fonana_wallet_persistence'

export function useWalletPersistence() {
  const { connected, wallet, publicKey, connecting, select, connect } = useWallet()

  // Сохраняем состояние подключения при изменении
  useEffect(() => {
    if (connected && wallet && publicKey) {
      const persistenceData = {
        walletName: wallet.adapter.name,
        publicKey: publicKey.toString(),
        timestamp: Date.now()
      }
      localStorage.setItem(WALLET_PERSISTENCE_KEY, JSON.stringify(persistenceData))
    }
  }, [connected, wallet, publicKey])

  // Пытаемся восстановить подключение при загрузке
  useEffect(() => {
    const restoreConnection = async () => {
      try {
        const savedData = localStorage.getItem(WALLET_PERSISTENCE_KEY)
        if (!savedData) return

        const { walletName, timestamp } = JSON.parse(savedData)
        
        // Проверяем, не истекла ли сессия (7 дней)
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - timestamp > sevenDays) {
          localStorage.removeItem(WALLET_PERSISTENCE_KEY)
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
              localStorage.removeItem(WALLET_PERSISTENCE_KEY)
            }
          }, 100)
        }
      } catch (error) {
        console.error('Error restoring wallet connection:', error)
        localStorage.removeItem(WALLET_PERSISTENCE_KEY)
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
        localStorage.removeItem(WALLET_PERSISTENCE_KEY)
      }
    }

    handleDisconnect()
  }, [connected])

  return {
    clearPersistence: () => {
      localStorage.removeItem(WALLET_PERSISTENCE_KEY)
    }
  }
} 