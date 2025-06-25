'use client'

import { SimpleWalletConnect } from '@/components/SimpleWalletConnect'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUser } from '@/lib/hooks/useUser'

export default function SimpleAuthTestPage() {
  const { connected, publicKey } = useWallet()
  const { user } = useUser()
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Простая авторизация (без JWT)</h1>
      
      {/* Статус подключения */}
      <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Статус подключения</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Кошелек подключен:</span>{' '}
            <span className={connected ? 'text-green-600' : 'text-red-600'}>
              {connected ? 'Да ✅' : 'Нет ❌'}
            </span>
          </p>
          {publicKey && (
            <p>
              <span className="font-medium">Адрес:</span>{' '}
              <span className="font-mono text-sm">{publicKey.toString()}</span>
            </p>
          )}
        </div>
      </div>
      
      {/* Информация о пользователе */}
      {user && (
        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Данные пользователя</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">ID:</span> {user.id}</p>
            <p><span className="font-medium">Кошелек:</span> {user.wallet}</p>
            <p><span className="font-medium">Никнейм:</span> {user.nickname}</p>
            <p><span className="font-medium">Создатель:</span> {user.isCreator ? 'Да' : 'Нет'}</p>
          </div>
        </div>
      )}
      
      {/* Кнопка подключения */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Подключение кошелька</h2>
        <SimpleWalletConnect />
      </div>
      
      {/* Инструкции */}
      <div className="p-6 bg-green-100 dark:bg-green-900/20 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">✅ Преимущества простой версии</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Нет JWT токенов и сложной логики</li>
          <li>Работает напрямую через wallet-adapter</li>
          <li>Авторизация сохраняется пока кошелек подключен</li>
          <li>Нет проблем с cookies и session storage</li>
          <li>Простое решение для показа подсказки во встроенных браузерах</li>
        </ul>
      </div>
    </div>
  )
} 