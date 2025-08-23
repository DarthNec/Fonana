import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'

export const maxDuration = 30 // Allow time for large file processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'support'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('🎯 [SUPPORT UPLOAD API] Support image upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      contentType: type
    })

    // Проверяем тип файла - только изображения для тикетов поддержки
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('🎯 [SUPPORT UPLOAD API] Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Недопустимый тип файла. Разрешены только изображения: JPG, PNG, GIF, WEBP' 
      }, { status: 400 })
    }

    // Проверяем размер файла (максимум 10MB для изображений поддержки)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `Файл слишком большой. Максимальный размер: ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 })
    }

    // Загружаем файл в BunnyStorage
    const uploadResult = await uploadToBunnyStorage(file, 'support')

    if (!uploadResult.success) {
      console.error('🎯 [SUPPORT UPLOAD API] Upload failed:', uploadResult.error)
      return NextResponse.json({ 
        error: uploadResult.error || 'Ошибка загрузки файла' 
      }, { status: 500 })
    }

    console.log('🎯 [SUPPORT UPLOAD API] Upload successful:', {
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl
    })

    return NextResponse.json({
      success: true,
      url: uploadResult.fileUrl, // Для совместимости с существующим кодом
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl
    })

  } catch (error) {
    console.error('🎯 [SUPPORT UPLOAD API] Error uploading support image:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 