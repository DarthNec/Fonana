import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserByWallet } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/user/tier-settings - получить настройки тиров создателя
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get('creatorId')
    const wallet = searchParams.get('wallet')
    
    let userId = creatorId
    
    // Если передан wallet вместо ID, найдем пользователя
    if (!userId && wallet) {
      const user = await getUserByWallet(wallet)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      userId = user.id
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Creator ID or wallet required' }, { status: 400 })
    }
    
    // Получаем настройки тиров
    const settings = await prisma.creatorTierSettings.findUnique({
      where: { creatorId: userId }
    })
    
    // Если настроек нет, возвращаем дефолтные
    if (!settings) {
      return NextResponse.json({
        settings: {
          basicTier: {
            enabled: true,
            price: 0.05,
            description: 'Access to basic content',
            features: [
              { id: 'basic-1', text: 'Access to basic subscriber content', enabled: true },
              { id: 'basic-2', text: 'Direct messaging', enabled: true },
              { id: 'basic-3', text: 'Comment on posts', enabled: true }
            ]
          },
          premiumTier: {
            enabled: true,
            price: 0.15,
            description: 'Premium subscription',
            features: [
              { id: 'premium-1', text: 'Everything in Basic', enabled: true },
              { id: 'premium-2', text: 'Access to premium content', enabled: true },
              { id: 'premium-3', text: 'Behind the scenes', enabled: true }
            ]
          },
          vipTier: {
            enabled: true,
            price: 0.35,
            description: 'VIP subscription',
            features: [
              { id: 'vip-1', text: 'Everything in Premium', enabled: true },
              { id: 'vip-2', text: 'Exclusive VIP content', enabled: true },
              { id: 'vip-3', text: 'Direct access to creator', enabled: true }
            ]
          }
        }
      })
    }
    
    return NextResponse.json({
      settings: {
        basicTier: settings.basicTier || {},
        premiumTier: settings.premiumTier || {},
        vipTier: settings.vipTier || {}
      }
    })
  } catch (error) {
    console.error('Error fetching tier settings:', error)
    return NextResponse.json({ error: 'Failed to fetch tier settings' }, { status: 500 })
  }
}

// PUT /api/user/tier-settings - обновить настройки тиров
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 })
    }
    
    // Получаем пользователя
    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем, что пользователь является создателем
    if (!user.isCreator) {
      return NextResponse.json({ error: 'Only creators can update tier settings' }, { status: 403 })
    }
    
    const body = await req.json()
    const { basicTier, premiumTier, vipTier } = body
    
    // Создаем или обновляем настройки
    const settings = await prisma.creatorTierSettings.upsert({
      where: { creatorId: user.id },
      update: {
        basicTier,
        premiumTier,
        vipTier,
        updatedAt: new Date()
      },
      create: {
        creatorId: user.id,
        basicTier,
        premiumTier,
        vipTier
      }
    })
    
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error updating tier settings:', error)
    return NextResponse.json({ error: 'Failed to update tier settings' }, { status: 500 })
  }
} 