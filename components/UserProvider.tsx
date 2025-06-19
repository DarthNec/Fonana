'use client'

import { useUser } from '@/lib/hooks/useUser'
import { useWallet } from '@solana/wallet-adapter-react'
import ProfileSetupModal from './ProfileSetupModal'

interface UserProviderProps {
  children: React.ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const { publicKey } = useWallet()
  const { 
    user, 
    isNewUser, 
    showProfileForm, 
    setShowProfileForm, 
    updateProfile 
  } = useUser()

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

  return (
    <>
      {children}
      {user && showProfileForm && (
        <ProfileSetupModal
          isOpen={showProfileForm}
          onClose={() => setShowProfileForm(false)}
          onComplete={handleProfileComplete}
          userWallet={user.wallet}
        />
      )}
    </>
  )
}

export default UserProvider 