'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhotoIcon,
  BellIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  HeartIcon,
  StarIcon,
  WalletIcon,
  CalendarIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  PencilIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import SubscriptionTiersSettings from '@/components/SubscriptionTiersSettings'
import UserSubscriptions from '@/components/UserSubscriptions'
import Avatar from '@/components/Avatar'
import PostCard from '@/components/PostCard'
import EditPostModal from '@/components/EditPostModal'
import toast from 'react-hot-toast'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { isValidNickname, isReservedNickname } from '@/lib/utils/links'
import { LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface UserProfile {
  id: string
  name: string
  username: string
  nickname: string
  email: string
  avatar: string
  backgroundImage: string
  bio: string
  isAnonymous: boolean
  notifications: {
    comments: boolean
    likes: boolean
    newPosts: boolean
    subscriptions: boolean
  }
  privacy: {
    showActivity: boolean
    allowMessages: boolean
    showOnline: boolean
  }
  theme: 'light' | 'dark' | 'auto'
}

// Component for displaying user's posts
function MyPostsSection({ userId }: { userId?: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)

  useEffect(() => {
    if (userId) {
      fetchUserPosts()
    }
  }, [userId])

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`/api/posts?creatorId=${userId}`)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPost = (post: any) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handlePostUpdated = () => {
    setShowEditModal(false)
    setEditingPost(null)
    fetchUserPosts()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-12 shadow-lg text-center">
        <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No posts yet</h3>
        <p className="text-gray-600 dark:text-slate-400 mb-6">Start creating content to see it here</p>
        <a
          href="/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
        >
          <PencilIcon className="w-5 h-5" />
          Create your first post
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            My Posts ({posts.length})
          </h2>
          <a
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
          >
            <PencilIcon className="w-4 h-4" />
            Create New
          </a>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              {...post}
              showCreator={false}
              onEditClick={handleEditPost}
            />
          ))}
        </div>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
          post={editingPost}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading, deleteAccount, updateProfile, refreshUser } = useUser()
  const { disconnect } = useWallet()
  const { theme: currentTheme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'profile' | 'creator' | 'subscriptions' | 'posts'>('profile')
  
  const [formData, setFormData] = useState<UserProfile>({
    id: user?.id || '',
    name: user?.fullName || '',
    username: user?.nickname || '',
    nickname: user?.nickname || '',
    email: '',
    avatar: user?.avatar || '',
    backgroundImage: user?.backgroundImage || '',
    bio: user?.bio || '',
    isAnonymous: false,
    notifications: {
      comments: true,
      likes: true,
      newPosts: true,
      subscriptions: true,
    },
    privacy: {
      showActivity: true,
      allowMessages: true,
      showOnline: true,
    },
    theme: currentTheme || 'dark',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Nickname validation states
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'>('idle')
  const [nicknameCheckTimeout, setNicknameCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // User statistics
  const [userStats, setUserStats] = useState({
    postsCount: 0,
    subscribersCount: 0,
    totalEarned: 0,
    memberSince: new Date()
  })

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        id: user.id,
        name: user.fullName || user.nickname || 'User',
        username: user.nickname || 'user',
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        backgroundImage: user.backgroundImage || '',
        bio: user.bio || '',
      }))
    }
  }, [user])
  
  // Загружаем настройки пользователя
  useEffect(() => {
    if (user?.wallet) {
      fetchUserSettings()
    }
  }, [user?.wallet])
  
  const fetchUserSettings = async () => {
    try {
      const response = await fetch(`/api/user/settings?wallet=${user?.wallet}`)
      if (response.ok) {
        const data = await response.json()
        const settings = data.settings
        
        setFormData(prev => ({
          ...prev,
          notifications: {
            comments: settings.notifyComments,
            likes: settings.notifyLikes,
            newPosts: settings.notifyNewPosts,
            subscriptions: settings.notifySubscriptions,
          },
          privacy: {
            showActivity: settings.showActivity,
            allowMessages: settings.allowMessages,
            showOnline: settings.showOnlineStatus,
          },
          theme: settings.theme as 'light' | 'dark' | 'auto',
        }))
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }
  
  const fetchUserStats = async () => {
    if (!user?.id) return
    
    try {
      // Получаем количество постов
      const postsResponse = await fetch(`/api/posts?creatorId=${user.id}`)
      const postsData = await postsResponse.json()
      
      // Получаем подписчиков
      const subsResponse = await fetch(`/api/subscriptions?creatorId=${user.id}`)
      const subsData = await subsResponse.json()
      
      // Рассчитываем общий заработок
      const activeSubscriptions = subsData.subscriptions?.filter((sub: any) => sub.isActive) || []
      const totalEarned = activeSubscriptions.reduce((sum: number, sub: any) => {
        return sum + (sub.creatorAmount || sub.price * 0.9) // 90% идет создателю
      }, 0)
      
      setUserStats({
        postsCount: postsData.posts?.length || 0,
        subscribersCount: activeSubscriptions.length,
        totalEarned: totalEarned,
        memberSince: user.createdAt ? new Date(user.createdAt) : new Date()
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }
  
  // Загружаем статистику при монтировании
  useEffect(() => {
    if (user?.id) {
      fetchUserStats()
    }
  }, [user?.id])

  const checkNicknameAvailability = async (nickname: string) => {
    if (!nickname || nickname === user?.nickname) {
      setNicknameStatus('idle')
      return
    }

    // Validate format
    if (!isValidNickname(nickname)) {
      setNicknameStatus('invalid')
      return
    }

    // Check reserved names
    if (isReservedNickname(nickname)) {
      setNicknameStatus('reserved')
      return
    }

    setNicknameStatus('checking')
    
    try {
      const response = await fetch(`/api/user?nickname=${nickname}`)
      const data = await response.json()
      
      if (data.user && data.user.id !== user?.id) {
        setNicknameStatus('taken')
      } else {
        setNicknameStatus('available')
      }
    } catch (error) {
      setNicknameStatus('idle')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (field === 'theme') {
      setTheme(value as 'light' | 'dark' | 'auto')
    }
    
    if (field === 'nickname') {
      // Clear previous timeout
      if (nicknameCheckTimeout) {
        clearTimeout(nicknameCheckTimeout)
      }
      
      // Set new timeout to check after user stops typing
      const timeout = setTimeout(() => {
        checkNicknameAvailability(value)
      }, 500)
      
      setNicknameCheckTimeout(timeout)
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedChange = (section: 'notifications' | 'privacy', field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    // Don't save if nickname is being checked or invalid
    if (nicknameStatus === 'checking' || nicknameStatus === 'taken' || nicknameStatus === 'invalid' || nicknameStatus === 'reserved') {
      toast.error('Please fix nickname issues before saving')
      return
    }
    
    setIsSaving(true)
    try {
      // Сохраняем основную информацию профиля
      await updateProfile({
        nickname: formData.nickname,
        fullName: formData.name,
        bio: formData.bio,
        avatar: formData.avatar,
        backgroundImage: formData.backgroundImage,
      })
      
      // Сохраняем настройки
      if (user?.wallet) {
        const settingsResponse = await fetch(`/api/user/settings?wallet=${user.wallet}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notifyComments: formData.notifications.comments,
            notifyLikes: formData.notifications.likes,
            notifyNewPosts: formData.notifications.newPosts,
            notifySubscriptions: formData.notifications.subscriptions,
            showActivity: formData.privacy.showActivity,
            allowMessages: formData.privacy.allowMessages,
            showOnlineStatus: formData.privacy.showOnline,
            theme: formData.theme
          })
        })
        
        if (!settingsResponse.ok) {
          throw new Error('Failed to save settings')
        }
      }
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Profile updated')
      await refreshUser()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error saving profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Upload file to server
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload avatar')
        }
        
        const avatarUrl = data.avatarUrl
        
        // Update state
        setFormData(prev => ({ ...prev, avatar: avatarUrl }))
        
        // Save to database
        await updateProfile({ avatar: avatarUrl })
        
        // Update user data
        await refreshUser()
        
        toast.success('Avatar updated')
      } catch (error) {
        console.error('Error updating avatar:', error)
        toast.error(error instanceof Error ? error.message : 'Error updating avatar')
      }
    }
  }

  const handleBackgroundChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Upload file to server
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload/background', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload background')
        }
        
        const backgroundUrl = data.backgroundUrl
        
        // Update state
        setFormData(prev => ({ ...prev, backgroundImage: backgroundUrl }))
        
        // Save to database
        await updateProfile({ backgroundImage: backgroundUrl })
        
        // Update user data
        await refreshUser()
        
        toast.success('Background image updated')
      } catch (error) {
        console.error('Error updating background:', error)
        toast.error(error instanceof Error ? error.message : 'Error updating background')
      }
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
      await disconnect()
    } catch (error) {
      console.error('Error deleting account:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-purple-500/10 dark:from-purple-500/20 to-pink-500/10 dark:to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-blue-500/10 dark:from-blue-500/20 to-purple-500/10 dark:to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-pink-500/5 dark:from-pink-500/10 to-purple-500/5 dark:to-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 pt-32 pb-8 lg:pt-40 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Manage your account settings and personalize your profile
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 px-4 sm:px-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="flex sm:justify-center min-w-max px-4 sm:px-0">
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-2xl p-1 inline-flex shadow-lg">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'profile'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('subscriptions')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'subscriptions'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Subscriptions
                  </button>
                  <button
                    onClick={() => setActiveTab('creator')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'creator'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Creator
                  </button>
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'posts'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    My Posts
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Success Message */}
          {saved && (
            <div className="mb-8 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-3xl flex items-center gap-3 max-w-md mx-auto">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Profile settings saved!</span>
            </div>
          )}

          {activeTab === 'profile' ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="xl:col-span-3 space-y-8">
              {/* Profile Information */}
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  Basic Information
                </h2>

                <div className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <Avatar
                        src={formData.avatar ? `${formData.avatar}?t=${Date.now()}` : user?.avatar}
                        alt={user?.nickname || 'User avatar'}
                        seed={user?.nickname || formData.username}
                        size={96}
                        rounded="3xl"
                      />
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-white dark:border-slate-800"></div>
                    </div>
                    <div className="text-center sm:text-left">
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                        <PhotoIcon className="w-5 h-5" />
                        Change Photo
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      </label>
                      <p className="text-gray-600 dark:text-slate-400 text-sm mt-2">JPG, PNG up to 5MB</p>
                    </div>
                  </div>

                  {/* Background Image Section */}
                  <div className="border-t border-gray-200 dark:border-slate-700/50 pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Background Image</h3>
                    
                    {/* Temporary notification about lost backgrounds */}
                    {!formData.backgroundImage && !user?.backgroundImage && (
                      <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          ⚠️ Due to a recent system update, background images need to be re-uploaded. 
                          Please upload your background image again.
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Preview */}
                      {(formData.backgroundImage || user?.backgroundImage) && (
                        <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-4">
                          <img 
                            src={formData.backgroundImage || user?.backgroundImage} 
                            alt="Profile background" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 dark:from-slate-900/60 to-transparent"></div>
                        </div>
                      )}
                      
                      {/* Upload Button */}
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                        <PhotoIcon className="w-5 h-5" />
                        {(formData.backgroundImage || user?.backgroundImage) ? 'Change Background' : 'Upload Background'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundChange} />
                      </label>
                      <p className="text-gray-600 dark:text-slate-400 text-sm">Recommended size: 1920x400px, JPG or PNG up to 10MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                        Profile URL / Nickname
                      </label>
                      
                      {/* Info box */}
                      <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Choose a unique nickname for your short profile URL. Others can visit your profile at{' '}
                          <span className="font-mono font-semibold">fonana.me/your-nickname</span>
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LinkIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={formData.nickname}
                            onChange={(e) => handleInputChange('nickname', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                            className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-700/50 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 ${
                              nicknameStatus === 'taken' || nicknameStatus === 'invalid' || nicknameStatus === 'reserved'
                                ? 'border-red-500'
                                : nicknameStatus === 'available'
                                ? 'border-green-500'
                                : 'border-gray-300 dark:border-slate-600/50'
                            }`}
                            placeholder="your-custom-name"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            {nicknameStatus === 'checking' && (
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {nicknameStatus === 'available' && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            )}
                            {(nicknameStatus === 'taken' || nicknameStatus === 'invalid' || nicknameStatus === 'reserved') && (
                              <XCircleIcon className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        {/* Status messages */}
                        {nicknameStatus === 'available' && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✓ fonana.me/{formData.nickname} is available!
                          </p>
                        )}
                        {nicknameStatus === 'taken' && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            This nickname is already taken
                          </p>
                        )}
                        {nicknameStatus === 'invalid' && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Only letters, numbers, dash and underscore allowed
                          </p>
                        )}
                        {nicknameStatus === 'reserved' && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            This nickname is reserved and cannot be used
                          </p>
                        )}
                        {(!formData.nickname || formData.nickname === user?.nickname) && user?.nickname && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Current: fonana.me/{user.nickname}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                        About
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="pt-6 border-t border-gray-200 dark:border-slate-700/50">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || nicknameStatus === 'checking'}
                      className={`w-full px-6 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                        isSaving || nicknameStatus === 'checking'
                          ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-5 h-5" />
                          Save Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                    <BellIcon className="w-5 h-5 text-white" />
                  </div>
                  Notifications
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'comments', label: 'Comments on my posts', icon: ChatBubbleLeftIcon },
                    { key: 'likes', label: 'Likes on my content', icon: HeartIcon },
                    { key: 'newPosts', label: 'New posts from subscriptions', icon: StarIcon },
                    { key: 'subscriptions', label: 'New subscribers', icon: BellIcon },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl flex items-center justify-center">
                          <setting.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">{setting.label}</span>
                      </div>
                      <button
                        onClick={() => handleNestedChange('notifications', setting.key, !formData.notifications[setting.key as keyof typeof formData.notifications])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                          formData.notifications[setting.key as keyof typeof formData.notifications] 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                            : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                          formData.notifications[setting.key as keyof typeof formData.notifications] ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                    <EyeIcon className="w-5 h-5 text-white" />
                  </div>
                  Privacy & Security
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'showActivity', label: 'Show my activity publicly', icon: EyeIcon },
                    { key: 'allowMessages', label: 'Allow private messages', icon: ChatBubbleLeftIcon },
                    { key: 'showOnline', label: 'Show online status', icon: UserIcon },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-xl flex items-center justify-center">
                          <setting.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">{setting.label}</span>
                      </div>
                      <button
                        onClick={() => handleNestedChange('privacy', setting.key, !formData.privacy[setting.key as keyof typeof formData.privacy])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                          formData.privacy[setting.key as keyof typeof formData.privacy] 
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                            : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                          formData.privacy[setting.key as keyof typeof formData.privacy] ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-8">
              {/* Theme Settings */}
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center">
                    <SunIcon className="w-4 h-4 text-white" />
                  </div>
                  Theme
                </h3>
                
                <div className="space-y-3">
                  {[
                    { value: 'light', label: 'Light', icon: SunIcon },
                    { value: 'dark', label: 'Dark', icon: MoonIcon },
                    { value: 'auto', label: 'System', icon: ComputerDesktopIcon },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleInputChange('theme', theme.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                        formData.theme === theme.value 
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-700 dark:text-purple-300' 
                          : 'bg-gray-50 dark:bg-slate-700/30 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <theme.icon className="w-5 h-5" />
                      <span className="font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Stats */}
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Statistics</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                    <span className="text-gray-600 dark:text-slate-400">Posts created</span>
                    <span className="font-bold text-gray-900 dark:text-white">{userStats.postsCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                    <span className="text-gray-600 dark:text-slate-400">Subscribers</span>
                    <span className="font-bold text-gray-900 dark:text-white">{userStats.subscribersCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                    <span className="text-gray-600 dark:text-slate-400">Earned</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${userStats.totalEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-2xl">
                    <span className="text-gray-600 dark:text-slate-400">Member since</span>
                    <span className="font-bold text-gray-900 dark:text-white">{userStats.memberSince.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>

              {/* Danger Zone */}
              <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-red-400 to-rose-400 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                  </div>
                  Danger Zone
                </h3>
                <p className="text-red-300 text-sm mb-6">
                  Actions in this section are irreversible. Please be careful.
                </p>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 flex items-center justify-center gap-3"
                >
                  <TrashIcon className="w-5 h-5" />
                  Delete account permanently
                </button>
              </div>
            </div>
          </div>
          ) : activeTab === 'subscriptions' ? (
            /* Subscriptions Tab */
            <div className="max-w-5xl mx-auto">
              <UserSubscriptions />
            </div>
          ) : activeTab === 'creator' ? (
            /* Creator Settings Tab */
            <div className="max-w-5xl mx-auto">
              <SubscriptionTiersSettings />
            </div>
          ) : (
            /* My Posts Tab */
            <div className="max-w-5xl mx-auto">
              <MyPostsSection userId={user?.id} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
       {showDeleteConfirm && (
         <div className="fixed inset-0 z-50 overflow-y-auto">
           <div className="flex min-h-screen items-center justify-center p-4">
             {/* Overlay */}
             <div 
               className="fixed inset-0 bg-black/80 backdrop-blur-sm"
               onClick={() => setShowDeleteConfirm(false)}
             />
             
             {/* Modal */}
             <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-slate-700/50">
               {/* Warning Icon */}
               <div className="w-16 h-16 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <ExclamationTriangleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
               </div>
               
               {/* Header */}
               <div className="text-center mb-8">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                   <span className="bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400 bg-clip-text text-transparent">
                     Delete account?
                   </span>
                 </h2>
                 <p className="text-gray-600 dark:text-slate-400">
                   This action is irreversible. All your data, posts, and subscriptions will be deleted permanently.
                 </p>
               </div>

               {/* Warning List */}
               <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 mb-8">
                 <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-3">What will be deleted:</p>
                 <ul className="text-red-600 dark:text-red-200 text-sm space-y-1">
                   <li>• All your posts and content</li>
                   <li>• Subscriptions and subscribers</li>
                   <li>• Comments and likes</li>
                   <li>• Transaction history</li>
                 </ul>
               </div>

               {/* Buttons */}
               <div className="flex gap-4">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   disabled={isDeleting}
                   className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-2xl font-medium transition-all duration-300 hover:bg-gray-200 dark:hover:bg-slate-600/50 disabled:opacity-50"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleDeleteAccount}
                   disabled={isDeleting}
                   className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                 >
                   {isDeleting ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       Deleting...
                     </>
                   ) : (
                     <>
                       <TrashIcon className="w-4 h-4" />
                       Delete
                     </>
                   )}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  )
} 