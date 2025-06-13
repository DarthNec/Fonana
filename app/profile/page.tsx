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
  const { user, isLoading, deleteAccount, updateProfile } = useUser()
  const { disconnect } = useWallet()
  const [activeTab, setActiveTab] = useState<'profile' | 'creator' | 'subscriptions'>('profile')
  
  const [formData, setFormData] = useState<UserProfile>({
    id: 'user-1',
    name: 'User',
    username: 'user',
    email: '',
    avatar: '',
    bio: '',
    isAnonymous: false,
    notifications: {
      comments: true,
      likes: false,
      newPosts: true,
      subscriptions: true
    },
    privacy: {
      showActivity: true,
      allowMessages: true,
      showOnline: false
    },
    theme: 'dark'
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
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Профиль обновлен')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Ошибка при сохранении профиля')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        // Загружаем файл на сервер
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
        
        // Обновляем состояние
        setFormData(prev => ({ ...prev, avatar: avatarUrl }))
        
        // Сохраняем в базе данных
        await updateProfile({ avatar: avatarUrl })
        toast.success('Аватар обновлен')
      } catch (error) {
        console.error('Error updating avatar:', error)
        toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении аватара')
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
              Настройки профиля
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Управляйте настройками аккаунта и персонализируйте свой профиль
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
                Профиль
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'subscriptions'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Подписки
              </button>
              <button
                onClick={() => setActiveTab('creator')}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'creator'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Настройки автора
              </button>
            </div>
          </div>

          {/* Save Success Message */}
          {saved && (
            <div className="mb-8 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-3xl flex items-center gap-3 max-w-md mx-auto">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-emerald-300 font-medium">Настройки профиля сохранены!</span>
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
                  Основная информация
                </h2>

                <div className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <Avatar
                        src={user?.avatar || formData.avatar}
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
                        Изменить фото
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      </label>
                      <p className="text-slate-400 text-sm mt-2">JPG, PNG до 5MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Отображаемое имя
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Имя пользователя
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="@имя_пользователя"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Адрес электронной почты
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        placeholder="ваш@email.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        О себе
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                        rows={4}
                        placeholder="Расскажите о себе..."
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
                  Уведомления
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'comments', label: 'Комментарии к моим постам', icon: ChatBubbleLeftIcon },
                    { key: 'likes', label: 'Лайки на мой контент', icon: HeartIcon },
                    { key: 'newPosts', label: 'Новые посты от подписок', icon: StarIcon },
                    { key: 'subscriptions', label: 'Новые подписчики', icon: BellIcon },
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
                  Конфиденциальность и безопасность
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'showActivity', label: 'Показывать мою активность публично', icon: EyeIcon },
                    { key: 'allowMessages', label: 'Разрешить личные сообщения', icon: ChatBubbleLeftIcon },
                    { key: 'showOnline', label: 'Показывать статус онлайн', icon: UserIcon },
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
                  Тема
                </h3>
                
                <div className="space-y-3">
                  {[
                    { value: 'light', label: 'Светлая', icon: SunIcon },
                    { value: 'dark', label: 'Темная', icon: MoonIcon },
                    { value: 'auto', label: 'Системная', icon: ComputerDesktopIcon },
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
                <h3 className="text-xl font-bold text-white mb-6">Статистика</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Создано постов</span>
                    <span className="font-bold text-white">42</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Подписчиков</span>
                    <span className="font-bold text-white">1,234</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Заработано</span>
                    <span className="font-bold text-emerald-400">$2,845.50</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-2xl">
                    <span className="text-slate-400">Участник с</span>
                    <span className="font-bold text-white">Янв 2024</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>

              {/* Danger Zone */}
              <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-red-400 to-rose-400 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                  </div>
                  Опасная зона
                </h3>
                <p className="text-red-300 text-sm mb-6">
                  Действия в этом разделе необратимы. Пожалуйста, будьте осторожны.
                </p>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 flex items-center justify-center gap-3"
                >
                  <TrashIcon className="w-5 h-5" />
                  Удалить аккаунт навсегда
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
                     Удалить аккаунт?
                   </span>
                 </h2>
                 <p className="text-slate-400">
                   Это действие необратимо. Все ваши данные, посты и подписки будут удалены навсегда.
                 </p>
               </div>

               {/* Warning List */}
               <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
                 <p className="text-red-300 text-sm font-medium mb-3">Что будет удалено:</p>
                 <ul className="text-red-200 text-sm space-y-1">
                   <li>• Все ваши посты и контент</li>
                   <li>• Подписки и подписчики</li>
                   <li>• Комментарии и лайки</li>
                   <li>• История транзакций</li>
                 </ul>
               </div>

               {/* Buttons */}
               <div className="flex gap-4">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   disabled={isDeleting}
                   className="flex-1 px-6 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white rounded-2xl font-medium transition-all duration-300 hover:bg-slate-600/50 disabled:opacity-50"
                 >
                   Отмена
                 </button>
                 <button
                   onClick={handleDeleteAccount}
                   disabled={isDeleting}
                   className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                 >
                   {isDeleting ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       Удаление...
                     </>
                   ) : (
                     <>
                       <TrashIcon className="w-4 h-4" />
                       Удалить
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