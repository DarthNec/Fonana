import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { getNextAvatar } from '@/lib/utils/avatarAssigner'
import crypto from 'crypto'

/**
 * Генерация уникального никнейма (как у гостевых пользователей)
 */
async function generateUniqueNickname(): Promise<string> {
  const adjectives = [
    'Happy', 'Lucky', 'Brave', 'Swift', 'Clever', 'Bright', 'Silent', 
    'Golden', 'Silver', 'Crystal', 'Mystic', 'Shadow', 'Storm', 'Fire',
    'Ocean', 'Mountain', 'Forest', 'Night', 'Star', 'Moon'
  ]
  
  const nouns = [
    'Fox', 'Wolf', 'Eagle', 'Tiger', 'Bear', 'Lion', 'Hawk', 
    'Dragon', 'Phoenix', 'Panther', 'Falcon', 'Raven', 'Snake',
    'Shark', 'Dolphin', 'Whale', 'Leopard', 'Jaguar', 'Cobra'
  ]
  
  let nickname = ''
  let counter = 1
  let attempts = 0
  const maxAttempts = 50
  
  while (attempts < maxAttempts) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    
    if (counter === 1) {
      nickname = `${adjective}${noun}${number}`
    } else {
      nickname = `${adjective}${noun}${number}_${counter}`
    }
    
    // Проверяем уникальность
    const existing = await prisma.user.findFirst({ where: { nickname } })
    if (!existing) {
      return nickname
    }
    
    counter++
    attempts++
  }
  
  // Fallback: если не смогли найти уникальный - используем hex
  return `user_${crypto.randomBytes(4).toString('hex')}`
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile'
        }
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔴 [NEXTAUTH] signIn callback triggered', {
        provider: account?.provider,
        email: user.email,
        name: user.name
      })

      // Обрабатываем только Google OAuth
      if (account?.provider === 'google') {
        try {
          console.log('🔴 [GOOGLE AUTH] Processing Google sign-in...', {
            email: user.email,
            name: user.name,
            googleId: account.providerAccountId
          })
          
          // Генерируем wallet для поиска
          const fakeWallet = `GOOGLE_${account.providerAccountId}`
          
          // Проверяем есть ли пользователь с таким email или wallet
          const existingUser = await prisma.user.findFirst({
            where: { 
              OR: [
                { email: user.email || undefined },
                // { googleId: account.providerAccountId }, // TODO: Раскомментировать после применения миграции
                { wallet: fakeWallet }
              ]
            }
          })
          
          if (!existingUser) {
            // Создаём нового пользователя с fake wallet (как для Telegram/Guest)
            const nickname = await generateUniqueNickname()
            console.log('🔴 [GOOGLE AUTH] Generated nickname:', nickname)
            
            const avatarUrl = await getNextAvatar()
            console.log('🔴 [GOOGLE AUTH] Assigned avatar:', avatarUrl)
            
            const newUser = await prisma.user.create({
              data: {
                wallet: fakeWallet,
                email: user.email,
                // googleId: account.providerAccountId, // TODO: Раскомментировать после применения миграции
                nickname: nickname,
                fullName: nickname,
                avatar: avatarUrl,
                solanaWallet: null,
              }
            })
            
            console.log('🔴 [GOOGLE AUTH] ✅ New user created:', {
              id: newUser.id,
              wallet: newUser.wallet,
              nickname: newUser.nickname,
              fullName: newUser.fullName,
              email: newUser.email
            })
          } else {
            console.log('🔴 [GOOGLE AUTH] ✅ Existing user found:', {
              id: existingUser.id,
              wallet: existingUser.wallet,
              nickname: existingUser.nickname
            })
            
            // Обновляем googleId если его не было (после миграции)
            // if (!existingUser.googleId) {
            //   await prisma.user.update({
            //     where: { id: existingUser.id },
            //     data: { 
            //       googleId: account.providerAccountId,
            //       email: user.email || existingUser.email
            //     }
            //   })
            //   console.log('🔴 [GOOGLE AUTH] Updated existing user with googleId')
            // }
          }
          
          // Возвращаем URL с email для callback страницы
          return `/auth/google/callback?email=${encodeURIComponent(user.email || '')}`
        } catch (error) {
          console.error('🔴 [GOOGLE AUTH] Error in signIn callback:', error)
          return false
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: false,
} 