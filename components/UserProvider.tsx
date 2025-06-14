'use client'

import { useUser } from '@/lib/hooks/useUser'
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
    </>
  )
} 