'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/store/appStore'
import { 
  MagnifyingGlassIcon,
  UserGroupIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface User {
  id: string
  nickname: string
  fullName?: string
  wallet: string
  createdAt: string
  referrerId?: string
  referrer?: {
    id: string
    nickname: string
    fullName?: string
  }
}

export default function AdminReferralsPage() {
  const user = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newReferrer, setNewReferrer] = useState('')
  const [updating, setUpdating] = useState(false)

  // Check if user is admin (you should implement proper admin check)
  const isAdmin = user?.wallet === 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4' || 
                  user?.wallet === 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'x-user-wallet': user?.wallet || ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateReferrer = async () => {
    if (!selectedUser) return

    setUpdating(true)
    try {
      const response = await fetch('/api/admin/update-referrer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-wallet': user?.wallet || ''
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          referrerNickname: newReferrer
        })
      })

      if (response.ok) {
        toast.success('Referrer updated successfully')
        setSelectedUser(null)
        setNewReferrer('')
        fetchUsers() // Refresh users
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update referrer')
      }
    } catch (error) {
      console.error('Error updating referrer:', error)
      toast.error('Failed to update referrer')
    } finally {
      setUpdating(false)
    }
  }

  const removeReferrer = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this referrer?')) return

    try {
      const response = await fetch('/api/admin/update-referrer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-wallet': user?.wallet || ''
        },
        body: JSON.stringify({
          userId,
          referrerNickname: null
        })
      })

      if (response.ok) {
        toast.success('Referrer removed successfully')
        fetchUsers()
      } else {
        toast.error('Failed to remove referrer')
      }
    } catch (error) {
      console.error('Error removing referrer:', error)
      toast.error('Failed to remove referrer')
    }
  }

  const filteredUsers = users.filter(user => 
    user.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.wallet.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-gray-500 dark:text-slate-400">Please sign in</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-red-500">Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Referral Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Admin panel for managing referral relationships
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by nickname, name or wallet..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">With Referrer</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.referrerId).length}
                </p>
              </div>
              <LinkIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Without Referrer</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => !u.referrerId).length}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Wallet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Referrer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-slate-400">Loading...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-slate-400">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.fullName || user.nickname}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            @{user.nickname}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600 dark:text-slate-300 font-mono">
                          {user.wallet.slice(0, 8)}...{user.wallet.slice(-6)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.referrer ? (
                          <div className="flex items-center">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              @{user.referrer.nickname}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-slate-500">
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setNewReferrer(user.referrer?.nickname || '')
                            }}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            Edit
                          </button>
                          {user.referrerId && (
                            <button
                              onClick={() => removeReferrer(user.id)}
                              className="text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit Referrer for @{selectedUser.nickname}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Referrer Nickname
                </label>
                <input
                  type="text"
                  value={newReferrer}
                  onChange={(e) => setNewReferrer(e.target.value)}
                  placeholder="Enter referrer nickname (leave empty to remove)"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    setNewReferrer('')
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updateReferrer}
                  disabled={updating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 