'use client'

import { Fragment } from 'react'
import { 
  SafeDialog as Dialog, 
  SafeDialogPanel,
  SafeDialogTitle,
  SafeTransition as Transition,
  SafeTransitionChild 
} from '@/components/ui/ssr-safe'
import { X } from 'lucide-react'
import { SubscriptionPayment } from './SubscriptionPayment'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  creator: {
    id: string
    name: string
    wallet?: string | null
    solanaWallet?: string | null
    referrerId?: string | null
    referrer?: {
      solanaWallet?: string | null
      wallet?: string | null
    } | null
  }
}

const DEFAULT_PLANS = [
  {
    id: 'monthly',
    name: 'Месячная подписка',
    price: 0.1, // 0.1 SOL
    duration: '30 дней доступа'
  },
  {
    id: 'yearly',
    name: 'Годовая подписка',
    price: 1, // 1 SOL
    duration: '365 дней доступа'
  }
]

export function SubscriptionModal({ isOpen, onClose, creator }: SubscriptionModalProps) {
  const creatorWallet = creator.solanaWallet || creator.wallet
  const referrerWallet = creator.referrer?.solanaWallet || creator.referrer?.wallet || undefined
  
  if (!creatorWallet) {
    return null
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
                      <SafeTransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
                      </SafeTransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <SafeTransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
                              <SafeDialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <SafeDialogTitle className="text-lg font-medium">
                    Подписка на {creator.name}
                  </SafeDialogTitle>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <SubscriptionPayment
                  creatorId={creator.id}
                  creatorName={creator.name}
                  creatorWallet={creatorWallet}
                  hasReferrer={!!creator.referrerId && !!referrerWallet}
                  referrerWallet={referrerWallet}
                  plans={DEFAULT_PLANS}
                />
              </SafeDialogPanel>
            </SafeTransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 