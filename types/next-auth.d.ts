import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isCreator?: boolean
      nickname?: string | null
      solanaWallet?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    isCreator?: boolean
    nickname?: string | null
    solanaWallet?: string | null
  }
} 