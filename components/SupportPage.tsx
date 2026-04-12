'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/lib/store/appStore'
import { useWallet } from '@/lib/hooks/useSafeWallet'
import { useSafeWalletModal } from '@/lib/hooks/useSafeWalletModal'
import { toast } from 'react-hot-toast'
import LogInMethodPopup from '@/components/LogInMethodPopup'
import { 
  PaperAirplaneIcon, 
  PhotoIcon, 
  XMarkIcon,
  TicketIcon, 
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UserIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ScaleIcon,
  LockClosedIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface SupportTicket {
  id: string
  userId: string
  userWallet: string
  username: string
  subject: string
  description: string
  images: string[]
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  updatedAt: string
  responses: SupportTicketResponse[]
}

interface SupportTicketResponse {
  id: string
  ticketId: string
  adminId: string
  adminWallet: string
  adminUsername: string
  message: string
  isAdminResponse: boolean
  createdAt: string
}

interface FAQItem {
  question: string
  answer: string
  icon: any
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

export default function SupportPage() {
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  
  const user = useUser()
  const { publicKey } = useWallet()
  const { setVisible } = useSafeWalletModal()
  const publicKeyString = publicKey?.toBase58() ?? null
  const isAuthenticated = !!(user?.id && publicKeyString)

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const faqSections: FAQSection[] = [
    {
      title: 'About',
      items: [
        {
          question: 'Why Fonana?',
          answer: 'Fonana is a decentralized content platform built on Solana blockchain. We prioritize creator independence, fair monetization, and censorship resistance. All transactions are transparent and recorded on-chain.',
          icon: RocketLaunchIcon
        },
        {
          question: 'Creator tips',
          answer: 'As a creator, you can monetize your content through subscriptions, individual post sales, and tips. Set your own prices, create exclusive tiers, and build direct relationships with your audience. All payments are instant and transparent via blockchain.',
          icon: SparklesIcon
        },
        {
          question: 'User tips',
          answer: 'Browse creators, subscribe to access exclusive content, purchase individual posts, and send tips to support creators you love. Your wallet gives you full control over your purchases and subscriptions.',
          icon: UserIcon
        },
        {
          question: 'Content Guidelines',
          answer: 'We support diverse creative content while maintaining community standards. All content must be legal and comply with our terms of service. Creators are responsible for their content and must respect copyright laws.',
          icon: DocumentTextIcon
        },
        {
          question: 'New Updates and Features',
          answer: 'We regularly update the platform with new features based on community feedback. Recent additions include: AI-generated content support, Remix functionality, improved wallet integration, and enhanced mobile experience.',
          icon: SparklesIcon
        }
      ]
    },
    {
      title: 'Payments',
      items: [
        {
          question: 'Billing and Payments',
          answer: 'All payments are processed via Solana blockchain using SOL cryptocurrency. Transactions are instant, transparent, and secured by the blockchain. Make sure you have enough SOL in your Phantom wallet to cover transaction fees.',
          icon: CreditCardIcon
        },
        {
          question: 'Creator Payouts',
          answer: 'Creators receive payments instantly to their connected wallet. There are no withdrawal delays or minimum thresholds. Platform fee is transparent and competitive. All transactions are recorded on-chain for full transparency.',
          icon: BanknotesIcon
        },
        {
          question: 'Chargeback Protections',
          answer: 'Blockchain transactions are irreversible by design, providing natural chargeback protection for creators. Users should carefully review purchases before confirming transactions. Disputes are handled through our support system.',
          icon: ShieldCheckIcon
        }
      ]
    },
    {
      title: 'Policies',
      items: [
        {
          question: '2257 Exemption Statement',
          answer: 'Fonana complies with all applicable content regulations. Creators are responsible for ensuring their content meets legal requirements in their jurisdiction. We maintain appropriate records and verification systems as required by law.',
          icon: DocumentTextIcon
        },
        {
          question: 'DMCA Notice & Takedown Policy',
          answer: 'We respect intellectual property rights. If you believe content on Fonana infringes your copyright, submit a DMCA notice through our support system. We will review and take appropriate action according to DMCA procedures.',
          icon: ScaleIcon
        }
      ]
    },
    {
      title: 'Notices',
      items: [
        {
          question: 'Privacy Policy',
          answer: 'We protect your privacy while leveraging blockchain transparency. Your wallet address is public on blockchain, but personal information is protected. We do not sell user data. Read our full privacy policy for details on data collection and usage.',
          icon: LockClosedIcon
        },
        {
          question: 'Complaints Policy',
          answer: 'We take user complaints seriously. Report inappropriate content, copyright violations, or policy violations through the report function on posts or via support ticket. Our moderation team reviews all reports within 24 hours.',
          icon: ChatBubbleLeftRightIcon
        },
        {
          question: 'Content Removal Policy',
          answer: 'Content may be removed if it violates our terms of service, community guidelines, or applicable laws. Creators are notified of removals with explanation. Appeals can be submitted through support. Repeated violations may result in account suspension.',
          icon: TrashIcon
        }
      ]
    }
  ]

  useEffect(() => {
    if (showTicketModal && isAuthenticated) {
      fetchTickets()
    }
  }, [showTicketModal, isAuthenticated])

  const fetchTickets = async () => {
    try {
      const userWallet = user?.wallet || user?.solanaWallet || publicKeyString
      if (!userWallet) return

      const response = await fetch(`/api/support/tickets?userId=me&userWallet=${userWallet}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length + images.length > 5) {
      toast.error('Maximum 5 images')
      return
    }

    setImages([...images, ...validFiles])
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrls(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!user?.id || !publicKeyString) {
      toast.error('Please log in to send a ticket')
      setShowLoginPopup(true)
      return
    }

    setIsSubmitting(true)

    try {
      const imageUrls: string[] = []
      
      for (const image of images) {
        const formData = new FormData()
        formData.append('file', image)
        formData.append('type', 'support')
        
        const uploadResponse = await fetch('/api/support/upload', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json()
          imageUrls.push(result.url || result.fileUrl)
        }
      }

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userWallet: publicKeyString,
          username: user.nickname || user.fullName || 'Unknown',
          subject: subject.trim(),
          description: description.trim(),
          images: imageUrls
        })
      })

      if (response.ok) {
        toast.success('Support ticket successfully sent!')
        setSubject('')
        setDescription('')
        setImages([])
        setPreviewUrls([])
        setShowCreateModal(false)
        fetchTickets()
      } else {
        toast.error('Error sending ticket')
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error)
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <ClockIcon className="w-4 h-4" />
      case 'IN_PROGRESS': return <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
      case 'RESOLVED': return <CheckCircleIcon className="w-4 h-4" />
      case 'CLOSED': return <XCircleIcon className="w-4 h-4" />
      default: return <ClockIcon className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Open'
      case 'IN_PROGRESS': return 'In progress'
      case 'RESOLVED': return 'Resolved'
      case 'CLOSED': return 'Closed'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Help and Support
          </h1>
        </div>

        {/* FAQ Sections - Vertical List with Accordions */}
        <div className="space-y-8 mb-12">
          {faqSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {/* Section Title */}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 px-2">
                {section.title}
              </h2>
              
              {/* Section Items */}
              <div className="border-t border-gray-200 dark:border-slate-700">
                {section.items.map((item, itemIdx) => {
                  const itemId = `${sectionIdx}-${itemIdx}`
                  const isOpen = openItems.has(itemId)
                  
                  return (
                    <div 
                      key={itemIdx}
                      className="border-b border-gray-200 dark:border-slate-700"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full flex items-center justify-between px-4 py-5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 flex-1 pr-4">
                          <item.icon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className="text-base font-medium text-gray-900 dark:text-white">
                            {item.question}
                          </span>
                        </div>
                        <div className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Answer - Expandable */}
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-5 pt-1 pl-12">
                          <p className="text-base text-gray-600 dark:text-slate-400 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support Button */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              setShowLoginPopup(true)
            } else {
              setShowTicketModal(true)
            }
          }}
          className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all font-semibold text-lg text-gray-900 dark:text-white"
        >
          Contact Support
        </button>
      </div>

      {/* Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Support Tickets
              </h2>
              <button
                onClick={() => {
                  setShowTicketModal(false)
                  setSelectedTicket(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {!showCreateModal && !selectedTicket ? (
                <>
                  {/* Create Button */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full mb-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                  >
                    Create New Ticket
                  </button>

                  {/* Tickets List */}
                  {tickets.length === 0 ? (
                    <div className="text-center py-12">
                      <TicketIcon className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-slate-400">No tickets yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {ticket.subject}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                              {getStatusText(ticket.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2 mb-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
                            <span>{formatDate(ticket.createdAt)}</span>
                            <span>{ticket.responses.length} responses</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : selectedTicket ? (
                <>
                  {/* Back Button */}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-4"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to tickets
                  </button>

                  {/* Ticket Details */}
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTicket.subject}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusIcon(selectedTicket.status)}
                        {getStatusText(selectedTicket.status)}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>

                    {selectedTicket.images.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Attachments:</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedTicket.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(image, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <EyeIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Response History:</h4>
                      <div className="space-y-3">
                        {selectedTicket.responses.map((response) => (
                          <div
                            key={response.id}
                            className={`p-4 rounded-lg ${
                              response.isAdminResponse
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                                : 'bg-gray-50 dark:bg-slate-700 border-l-4 border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {response.isAdminResponse ? 'Support' : response.adminUsername}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                {formatDate(response.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap">
                              {response.message}
                            </p>
                          </div>
                        ))}

                        {selectedTicket.responses.length === 0 && (
                          <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-6">
                            No responses yet. We'll respond as soon as possible.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Back Button */}
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-4"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to tickets
                  </button>

                  {/* Create Ticket Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="Briefly describe the problem"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none"
                        placeholder="Describe your problem in detail..."
                        maxLength={1000}
                        required
                      />
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {description.length}/1000
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Images (optional, max 5)
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={images.length >= 5}
                        className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {images.length >= 5 ? 'Maximum 5 images' : 'Click to upload images'}
                        </p>
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {previewUrls.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !subject.trim() || !description.trim()}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-5 h-5" />
                          Send Ticket
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Popup */}
      <LogInMethodPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        onPhantomLogin={() => setVisible(true)}
        onLoginSuccess={() => {
          setShowLoginPopup(false)
          setShowTicketModal(true)
        }}
      />
    </div>
  )
}
