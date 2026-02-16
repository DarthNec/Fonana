'use client'

import { useState, useEffect } from 'react'
import ProfileSetupModal from './ProfileSetupModal'
import { useUser } from '@/lib/store/appStore'
import toast from 'react-hot-toast'

interface ProfileData {
  nickname: string
  fullName: string
  bio: string
  avatar?: string
  backgroundImage?: string
  website?: string
  twitter?: string
  telegram?: string
}

export default function NewUserProfileSetup() {
  const [showSetup, setShowSetup] = useState(false)
  const user = useUser()

  useEffect(() => {
    console.log('[NewUserProfileSetup] Checking for new user flag...')
    
    // Проверяем флаг isNewUser из localStorage
    const isNewUser = localStorage.getItem('fonana_is_new_user') === 'true'
    
    console.log('[NewUserProfileSetup] isNewUser:', isNewUser)
    console.log('[NewUserProfileSetup] user:', user?.id)
    
    if (isNewUser && user && user.id) {
      console.log('[NewUserProfileSetup] Opening ProfileSetupModal for new user')
      setShowSetup(true)
    }
  }, [user])

  const handleComplete = async (profileData: ProfileData) => {
    console.log('[NewUserProfileSetup] Profile setup completed:', profileData)
    
    try {
      // Сохраняем профиль через API
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: user?.wallet,
          ...profileData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      console.log('[NewUserProfileSetup] Profile saved successfully')
      
      // Убираем флаг isNewUser
      localStorage.removeItem('fonana_is_new_user')
      console.log('[NewUserProfileSetup] Removed isNewUser flag')
      
      // Закрываем модалку
      setShowSetup(false)
      
      toast.success('Profile setup completed! Welcome to Fonana 🎉')
      
      // Перезагружаем страницу для обновления данных
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
    } catch (error) {
      console.error('[NewUserProfileSetup] Error saving profile:', error)
      toast.error('Failed to save profile. Please try again.')
    }
  }

  const handleClose = () => {
    console.log('[NewUserProfileSetup] Modal closed by user')
    // Можно закрыть, но флаг остаётся (напомним позже)
    setShowSetup(false)
    
    // Уведомление, что можно заполнить позже
    toast('You can complete your profile setup later from settings', {
      icon: 'ℹ️',
      duration: 4000
    })
  }

  // Не рендерим, если нет пользователя или модалка не нужна
  if (!user || !showSetup) {
    return null
  }

  return (
    <ProfileSetupModal
      isOpen={showSetup}
      onClose={handleClose}
      onComplete={handleComplete}
      userWallet={user.wallet}
      mode="create"
      initialData={{
        nickname: user.nickname,
        fullName: user.fullName || '',
        avatar: user.avatar || undefined,
        bio: ''
      }}
    />
  )
}
