import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { referralLogger } from '@/lib/utils/logger'

// POST /api/admin/update-referrer - обновить реферера пользователя
export async function POST(request: NextRequest) {
  try {
    // Get user wallet from headers for admin check
    const userWallet = request.headers.get('x-user-wallet')
    
    // Simple admin check (you should implement proper authentication)
    const adminWallets = [
      'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4', // fonanadev
      'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG'  // Dogwater
    ]
    
    if (!userWallet || !adminWallets.includes(userWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId, referrerNickname } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // If referrerNickname is null or empty, remove referrer
    if (!referrerNickname) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referrerId: null }
      })
      
      referralLogger.info('Admin removed referrer', {
        adminWallet: userWallet.slice(0, 8) + '...',
        userId,
        action: 'remove_referrer'
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Referrer removed',
        user: updated 
      })
    }
    
    // Find referrer by nickname (case-insensitive)
    const referrer = await prisma.user.findFirst({
      where: {
        nickname: {
          equals: referrerNickname,
          mode: 'insensitive'
        }
      }
    })
    
    if (!referrer) {
      return NextResponse.json({ 
        error: 'Referrer not found',
        message: `User with nickname "${referrerNickname}" not found` 
      }, { status: 404 })
    }
    
    // Check if user is trying to set themselves as referrer
    if (referrer.id === userId) {
      return NextResponse.json({ 
        error: 'Invalid referrer',
        message: 'User cannot be their own referrer' 
      }, { status: 400 })
    }
    
    // Update user's referrer
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { referrerId: referrer.id },
      include: {
        referrer: {
          select: {
            id: true,
            nickname: true,
            fullName: true
          }
        }
      }
    })
    
    referralLogger.info('Admin updated referrer', {
      adminWallet: userWallet.slice(0, 8) + '...',
      userId,
      referrerId: referrer.id,
      referrerNickname: referrer.nickname,
      action: 'update_referrer'
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Referrer updated successfully',
      user: updated 
    })
    
  } catch (error) {
    console.error('Error updating referrer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 