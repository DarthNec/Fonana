'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useUser } from '@/lib/store/appStore'
import { 
  BoltIcon, 
  PlusIcon,
  TrashIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import FlashSale from './FlashSale'
import CreateFlashSale from './CreateFlashSale'

interface FlashSalesListProps {
  isOwner?: boolean
}

export default function FlashSalesList({ isOwner = false }: FlashSalesListProps) {
  const { publicKey } = useWallet()
  const publicKeyString = publicKey?.toBase58() ?? null // 🔥 ALTERNATIVE FIX: Stable string
  const user = useUser()
  const [flashSales, setFlashSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>()

  useEffect(() => {
    loadFlashSales()
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadFlashSales, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadFlashSales = async () => {
    try {
      const params = new URLSearchParams()
      params.append('creatorId', 'mockCreatorId')
      
      const response = await fetch(`/api/flash-sales?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setFlashSales(data.flashSales)
      }
    } catch (error) {
      console.error('Error loading flash sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (flashSaleId: string) => {
    if (!publicKeyString) return
    
    const confirmed = window.confirm('Are you sure you want to cancel this flash sale?')
    if (!confirmed) return

    try {
      const params = new URLSearchParams({
        id: flashSaleId,
        userWallet: publicKeyString
      })
      
      const response = await fetch(`/api/flash-sales?${params}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel flash sale')
      }

      toast.success('Flash sale cancelled')
      loadFlashSales()
    } catch (error) {
      console.error('Error deleting flash sale:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel flash sale')
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl">
            <BoltIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Flash Sales
          </h2>
          {flashSales.length > 0 && (
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium">
              {flashSales.length} Active
            </span>
          )}
        </div>
        
        {isOwner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all transform hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            Create Flash Sale
          </button>
        )}
      </div>

      {/* Flash Sales List */}
      {flashSales.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flashSales.map(sale => (
            <div key={sale.id} className="relative">
              <FlashSale 
                flashSale={sale}
                className="h-full"
              />
              
              {/* Admin controls */}
              {isOwner && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleDelete(sale.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                    title="Cancel flash sale"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Stats */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <ChartBarIcon className="w-3 h-3" />
                  <span>{sale.redemptionsCount} redeemed</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <ClockIcon className="w-3 h-3" />
                  <span>Started {new Date(sale.startAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <BoltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Active Flash Sales
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isOwner 
              ? "Create a flash sale to boost your sales with limited-time discounts"
              : "Check back later for amazing deals!"
            }
          </p>
          {isOwner && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all transform hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              Create Your First Flash Sale
            </button>
          )}
        </div>
      )}

      {/* Create Flash Sale Modal */}
      {showCreateModal && (
        <CreateFlashSale
          postId={selectedPostId}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedPostId(undefined)
          }}
          onCreated={() => {
            loadFlashSales()
            toast.success('Flash sale created! 🎉')
          }}
        />
      )}
    </div>
  )
} 