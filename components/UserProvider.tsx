'use client'

import { useUser } from '@/lib/hooks/useUser'
import ProfileSetupModal from './ProfileSetupModal'
import { useWallet } from '@solana/wallet-adapter-react'

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



  return (
    <>
      {children}
      
      {/* Модальное окно настройки профиля для новых пользователей */}
      {publicKey && (
        <ProfileSetupModal
          isOpen={showProfileForm}
          onClose={() => setShowProfileForm(false)}
          onSave={updateProfile}
          userWallet={publicKey.toString()}
        />
      )}
    </>
  )
} 