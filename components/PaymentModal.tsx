'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import toast from 'react-hot-toast'
import { executePayment, PaymentParams, getPlatformFee } from '@/lib/payments'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'subscription' | 'donation' | 'content'
  amount: number
  currency: 'SOL' | 'USDC'
  recipientAddress: string
  title: string
  description?: string
  onSuccess?: (result: { signature: string; amount: number; recipient: string }) => void
  onError?: (error: { error: string }) => void
}

export function PaymentModal({
  isOpen,
  onClose,
  type,
  amount,
  currency,
  recipientAddress,
  title,
  description,
  onSuccess,
  onError
}: PaymentModalProps) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [isProcessing, setIsProcessing] = useState(false)
  const [comment, setComment] = useState('')

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction || !connection) {
      toast.error('Connect wallet')
      return
    }

    setIsProcessing(true)

    try {
      const toPublicKey = new PublicKey(recipientAddress)
      const amountInLamports = amount * 1e9 // Convert SOL to lamports

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toPublicKey,
          lamports: amountInLamports,
        })
      )

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      onSuccess?.({
        signature,
        amount,
        recipient: recipientAddress,
      })

      toast.success(`Payment sent successfully! Signature: ${signature.slice(0, 8)}...`)
      onClose()
    } catch (error) {
      console.error('Payment error:', error)
      onError?.({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'subscription': return 'Subscription'
      case 'donation': return 'Donation'
      case 'content': return 'Content Purchase'
      default: return 'Payment'
    }
  }

  const platformFee = getPlatformFee(amount, type)

  const totalAmount = amount + platformFee

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {getTypeLabel()}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
                    {description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-300">Amount:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {amount} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-300">Platform Fee:</span>
                                             <span className="font-medium text-gray-900 dark:text-white">
                         {platformFee.toFixed(4)} {currency}
                       </span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-primary-600">
                        {totalAmount.toFixed(4)} {currency}
                      </span>
                    </div>
                  </div>

                  {type === 'donation' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Comment (optional)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="Write a message to the author..."
                      />
                    </div>
                  )}

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                      Funds will be sent directly to the author's wallet. Transaction is irreversible.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={!connected || isProcessing}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? 'Processing...' : `Send ${currency}`}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 