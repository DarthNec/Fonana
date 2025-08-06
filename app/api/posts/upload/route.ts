import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'

// 🔧 ФИКС M7: App Router body size configuration (Next.js 14 syntax)
export const maxDuration = 30 // Allow time for large file processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'image'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('🎯 [BUNNY UPLOAD API] Post media upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      contentType: type
    })

    // Проверяем тип файла в зависимости от типа контента
    const allowedTypes: Record<string, string[]> = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm']
    }

    const allowed = allowedTypes[type] || allowedTypes.image
    if (!allowed.includes(file.type)) {
      console.log('🎯 [BUNNY UPLOAD API] Invalid file type:', file.type)
      return NextResponse.json({ 
        error: `Недопустимый тип файла. Для ${type} разрешены: ${allowed.join(', ')}` 
      }, { status: 400 })
    }

    // Проверяем размер файла
    const maxSizes: Record<string, number> = {
      image: 100 * 1024 * 1024, // 100MB
      video: 200 * 1024 * 1024, // 200MB
      audio: 100 * 1024 * 1024, // 100MB
    }

    const maxSize = maxSizes[type] || maxSizes.image
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `Файл слишком большой. Максимальный размер: ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 })
    }

    // Загружаем файл в BunnyStorage
    const uploadResult = await uploadToBunnyStorage(file, type as 'image' | 'video' | 'audio')

    if (!uploadResult.success) {
      console.error('🎯 [BUNNY UPLOAD API] Upload failed:', uploadResult.error)
      return NextResponse.json({ 
        error: uploadResult.error || 'Ошибка загрузки файла' 
      }, { status: 500 })
    }

    console.log('🎯 [BUNNY UPLOAD API] Upload successful:', {
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl,
      previewUrl: uploadResult.previewUrl
    })

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl,
      previewUrl: uploadResult.previewUrl
    })

  } catch (error) {
    console.error('🎯 [BUNNY UPLOAD API] Error uploading post media:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 