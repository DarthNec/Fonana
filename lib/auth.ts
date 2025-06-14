import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        
        // Get additional user data
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            isCreator: true,
            nickname: true,
            solanaWallet: true,
          }
        })
        
        if (dbUser) {
          session.user.isCreator = dbUser.isCreator
          session.user.nickname = dbUser.nickname
          session.user.solanaWallet = dbUser.solanaWallet
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
} 