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
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import SubscriptionTiersSettings from '@/components/SubscriptionTiersSettings'
import UserSubscriptions from '@/components/UserSubscriptions'
import Avatar from '@/components/Avatar'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  name: string
  username: string
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

export default function ProfilePage() {
  const { user, isLoading, deleteAccount, updateProfile, refreshUser } = useUser()
  const { disconnect } = useWallet()
  const [activeTab, setActiveTab] = useState<'profile' | 'creator' | 'subscriptions'>('profile')
  
  const [formData, setFormData] = useState<UserProfile>({
    id: user?.id || '',
    name: user?.fullName || '',
    username: user?.nickname || '',
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
    theme: 'dark',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        id: user.id,
        name: user.fullName || user.nickname || 'User',
        username: user.nickname || 'user',
        avatar: user.avatar || '',
        bio: user.bio || '',
      }))
    }
  }, [user])

  const handleInputChange = (field: string, value: any) => {
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
    setIsSaving(true)
    try {
      await updateProfile({
        nickname: formData.username,
        fullName: formData.name,
        bio: formData.bio,
        avatar: formData.avatar,
        backgroundImage: formData.backgroundImage,
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Profile updated')
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
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full">
          <div className="w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 pt-32 pb-8 lg:pt-40 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Profile Settings
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Manage your account settings and personalize your profile
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1 inline-flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'subscriptions'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('creator')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'creator'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Creator Settings
              </button>
            </div>
          </div>

          {/* Save Success Message */}
          {saved && (
            <div className="mb-8 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-3xl flex items-center gap-3 max-w-md mx-auto">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-emerald-300 font-medium">Profile settings saved!</span>
            </div>
          )}

          {activeTab === 'profile' ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="xl:col-span-3 space-y-8">
              {/* Profile Information */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
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
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-slate-800"></div>
                    </div>
                    <div className="text-center sm:text-left">
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                        <PhotoIcon className="w-5 h-5" />
                        Change Photo
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      </label>
                      <p className="text-slate-400 text-sm mt-2">JPG, PNG up to 5MB</p>
                    </div>
                  </div>

                  {/* Background Image Section */}
                  <div className="border-t border-slate-700/50 pt-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Profile Background Image</h3>
                    <div className="space-y-4">
                      {/* Preview */}
                      {(formData.backgroundImage || user?.backgroundImage) && (
                        <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-4">
                          <img 
                            src={formData.backgroundImage || user?.backgroundImage} 
                            alt="Profile background" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        </div>
                      )}
                      
                      {/* Upload Button */}
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 cursor-pointer">
                        <PhotoIcon className="w-5 h-5" />
                        {(formData.backgroundImage || user?.backgroundImage) ? 'Change Background' : 'Upload Background'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundChange} />
                      </label>
                      <p className="text-slate-400 text-sm">Recommended size: 1920x400px, JPG or PNG up to 10MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="@username"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        About
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
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
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl flex items-center justify-center">
                          <setting.icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-white font-medium">{setting.label}</span>
                      </div>
                      <button
                        onClick={() => handleNestedChange('notifications', setting.key, !formData.notifications[setting.key as keyof typeof formData.notifications])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                          formData.notifications[setting.key as keyof typeof formData.notifications] 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                            : 'bg-slate-600'
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
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
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
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-xl flex items-center justify-center">
                          <setting.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-white font-medium">{setting.label}</span>
                      </div>
                      <button
                        onClick={() => handleNestedChange('privacy', setting.key, !formData.privacy[setting.key as keyof typeof formData.privacy])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                          formData.privacy[setting.key as keyof typeof formData.privacy] 
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                            : 'bg-slate-600'
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
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
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
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300' 
                          : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <theme.icon className="w-5 h-5" />
                      <span className="font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Stats */}
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Statistics</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Posts created</span>
                    <span className="font-bold text-white">42</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Subscribers</span>
                    <span className="font-bold text-white">1,234</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Earned</span>
                    <span className="font-bold text-emerald-400">$2,845.50</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Member since</span>
                    <span className="font-bold text-white">Jan 2024</span>
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
          ) : (
            /* Creator Settings Tab */
            <div className="max-w-5xl mx-auto">
              <SubscriptionTiersSettings />
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
             <div className="relative w-full max-w-md bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700/50">
               {/* Warning Icon */}
               <div className="w-16 h-16 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
               </div>
               
               {/* Header */}
               <div className="text-center mb-8">
                 <h2 className="text-2xl font-bold text-white mb-2">
                   <span className="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                     Delete account?
                   </span>
                 </h2>
                 <p className="text-slate-400">
                   This action is irreversible. All your data, posts, and subscriptions will be deleted permanently.
                 </p>
               </div>

               {/* Warning List */}
               <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
                 <p className="text-red-300 text-sm font-medium mb-3">What will be deleted:</p>
                 <ul className="text-red-200 text-sm space-y-1">
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
                   className="flex-1 px-6 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white rounded-2xl font-medium transition-all duration-300 hover:bg-slate-600/50 disabled:opacity-50"
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