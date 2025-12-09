import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'
import sharp from 'sharp'

const prisma = new PrismaClient()

export const maxDuration = 30

// GET - получить все активные истории (за последние 24 часа)
export async function GET(request: NextRequest) {
  try {
    console.log('[Stories API] GET request - fetching all stories')
    
    // Получаем userId из query параметров (опционально)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Получаем истории за последние 24 часа
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const stories = await (prisma as any).story.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isVerified: true
          }
        },
        emotions: true // Включаем все эмоции для истории
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('[Stories API] Found stories:', stories.length)
    
    // Форматируем истории с эмоциями
    const formattedStories = stories.map((story: any) => {
      // Находим эмоцию текущего пользователя для этой истории
      const userEmotion = userId 
        ? story.emotions.find((e: any) => e.userId === userId)
        : undefined

      return {
        id: story.id,
        userId: story.userId,
        type: story.type,
        mediaUrl: story.mediaUrl,
        likesCount: story.likesCount,
        viewsCount: story.viewsCount,
        createdAt: story.createdAt.toISOString(),
        user: story.user,
        emotions: story.emotions.map((emotion: any) => ({
          id: emotion.id,
          userId: emotion.userId,
          storyId: emotion.storyId,
          emotionId: emotion.emotionId,
          createdAt: emotion.createdAt.toISOString()
        })),
        userEmotion: userEmotion ? {
          id: userEmotion.id,
          userId: userEmotion.userId,
          storyId: userEmotion.storyId,
          emotionId: userEmotion.emotionId,
          createdAt: userEmotion.createdAt.toISOString()
        } : undefined
      }
    })
    
    return NextResponse.json({
      success: true,
      stories: formattedStories
    })
    
  } catch (error) {
    console.error('[Stories API] GET error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch stories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - создать новую историю
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userWallet = formData.get('userWallet') as string
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 400 })
    }
    
    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet not provided' }, { status: 400 })
    }
    
    console.log('[Stories API] POST request:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userWallet
    })
    
    // Находим пользователя по wallet
    const user = await prisma.user.findUnique({
      where: { wallet: userWallet }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Определяем тип контента
    let contentType: 'image' | 'video' = 'image'
    if (file.type.startsWith('video/')) {
      contentType = 'video'
    }
    
    // Проверяем тип файла
    const allowedTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime']
    }
    
    const allowed = allowedTypes[contentType]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: ${allowed.join(', ')}` 
      }, { status: 400 })
    }
    
    // Проверяем размер файла
    const maxSizes: Record<string, number> = {
      image: 100 * 1024 * 1024, // 100MB
      video: 200 * 1024 * 1024, // 200MB
    }
    
    const maxSize = maxSizes[contentType]
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 })
    }
    
    // Конвертируем изображения в WebP перед загрузкой (кроме GIF)
    let fileToUpload: File = file
    if (contentType === 'image' && file.type !== 'image/gif') {
      try {
        console.log('[Stories API] Converting image to WebP...')
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Конвертируем в WebP с качеством 85%
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 85 })
          .toBuffer()
        
        console.log('[Stories API] WebP conversion successful:', {
          originalSize: `${(file.size / 1024).toFixed(2)} KB`,
          webpSize: `${(webpBuffer.length / 1024).toFixed(2)} KB`
        })
        
        // Создаем новый File объект с WebP данными
        const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' })
        const originalName = file.name.replace(/\.[^/.]+$/, '')
        fileToUpload = new File([webpBlob], `${originalName}.webp`, { type: 'image/webp' })
        
      } catch (conversionError) {
        console.error('[Stories API] WebP conversion failed, using original:', conversionError)
      }
    }
    
    // Загружаем файл в BunnyStorage
    console.log('[Stories API] Uploading to BunnyStorage...')
    const uploadResult = await uploadToBunnyStorage(fileToUpload, contentType)
    
    if (!uploadResult.success || !uploadResult.fileUrl) {
      console.error('[Stories API] Upload failed:', uploadResult.error)
      return NextResponse.json({ 
        error: uploadResult.error || 'Failed to upload file' 
      }, { status: 500 })
    }
    
    console.log('[Stories API] Upload successful:', uploadResult.fileUrl)
    
    // Создаем запись в БД
    const story = await prisma.story.create({
      data: {
        userId: user.id,
        type: contentType,
        mediaUrl: uploadResult.fileUrl,
        likesCount: 0,
        viewsCount: 0
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    })
    
    console.log('[Stories API] Story created:', story.id)
    
    return NextResponse.json({
      success: true,
      story
    })
    
  } catch (error) {
    console.error('[Stories API] POST error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create story',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}





