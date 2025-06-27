'use client'

import { UserContextProvider, useUserContext } from '@/lib/contexts/UserContext'
import ProfileSetupModal from './ProfileSetupModal'

interface UserProviderProps {
  children: React.ReactNode
}

// Внутренний компонент для модалки профиля
function ProfileModalHandler() {
  const { 
    user, 
    showProfileForm, 
    setShowProfileForm, 
    updateProfile 
  } = useUserContext()

  const handleProfileComplete = async (profileData: {
    nickname: string
    fullName: string
    bio: string
    avatar?: string
    backgroundImage?: string
    website?: string
    twitter?: string
    telegram?: string
  }) => {
    await updateProfile(profileData)
  }

  if (!user || !showProfileForm) return null

  return (
    <ProfileSetupModal
      isOpen={showProfileForm}
      onClose={() => setShowProfileForm(false)}
      onComplete={handleProfileComplete}
      userWallet={user.wallet}
    />
  )
}

// Основной провайдер - обертка над UserContextProvider
export function UserProvider({ children }: UserProviderProps) {
  return (
    <UserContextProvider>
      {children}
      <ProfileModalHandler />
    </UserContextProvider>
  )
}

export default UserProvider 