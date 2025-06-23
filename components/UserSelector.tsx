'use client'

import { useState, useEffect } from 'react'
import { UserIcon } from '@heroicons/react/24/outline'

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

interface UserSelectorProps {
  onUserSelect: (user: User | null) => void
  selectedUser?: User | null
}

export function UserSelector({ onUserSelect, selectedUser }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/test/users-with-wallets', {
        headers: {
          'x-user-wallet': localStorage.getItem('wallet') || ''
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users)
      setCurrentUser(data.currentUser)
      
      // Автовыбор первого создателя, если нет выбранного
      if (!selectedUser && data.users.length > 0) {
        const firstCreator = data.users.find((u: User) => u.isCreator) || data.users[0]
        onUserSelect(firstCreator)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Поиск пользователя..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />

      {/* Current User */}
      {currentUser && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Ваш аккаунт</p>
          <UserCard
            user={currentUser}
            isSelected={selectedUser?.id === currentUser.id}
            onSelect={() => onUserSelect(currentUser)}
          />
        </div>
      )}

      {/* Users List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            isSelected={selectedUser?.id === user.id}
            onSelect={() => onUserSelect(user)}
          />
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <p className="text-center text-gray-500 py-4">Пользователи не найдены</p>
      )}
    </div>
  )
}

function UserCard({ user, isSelected, onSelect }: { 
  user: User
  isSelected: boolean
  onSelect: () => void 
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500' 
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{user.nickname}</p>
              {user.isCreator && (
                <span className="text-xs px-2 py-0.5 bg-purple-500 text-white rounded-full">
                  Создатель
                </span>
              )}
            </div>
            
            {user.fullName && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.fullName}</p>
            )}
            
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {user.postsCount > 0 && <span>{user.postsCount} постов</span>}
              {user.subscribersCount > 0 && <span>{user.subscribersCount} подписчиков</span>}
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="text-purple-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Wallet & Referrer Info */}
      <div className="mt-3 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Кошелек:</span>
          <code className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            {user.wallet ? `${user.wallet.slice(0, 8)}...${user.wallet.slice(-6)}` : 'Не указан'}
          </code>
        </div>
        
        {user.referrer && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Реферал от:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {user.referrer.nickname}
              {user.referrer.wallet && (
                <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {user.referrer.wallet.slice(0, 6)}...
                </code>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
} 