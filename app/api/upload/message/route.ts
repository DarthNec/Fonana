import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {

    const data = await request.formData()
    const file = data.get('file') as unknown as File
    const type = data.get('type') as string // 'image' или 'video'

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    console.log('Message media upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadType: type
    })

    // Проверяем тип файла
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only images and videos are allowed for messages' 
      }, { status: 400 })
    }

    // Проверяем размер файла (20MB max для изображений, 100MB max для видео)
    const maxSize = isImage ? 20 * 1024 * 1024 : 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${maxSize / 1024 / 1024}MB for ${isImage ? 'images' : 'videos'}` 
      }, { status: 400 })
    }

    // Читаем файл в буфер
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let finalFile: File

    if (isImage) {
      // Оптимизируем изображения с помощью sharp
      const compressedBuffer = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .toFormat('webp', { quality: 85 })
        .toBuffer()

      console.log(
        `🎯 [MESSAGE IMAGE] Before: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, After: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`
      )

      finalFile = new File(
        [new Uint8Array(compressedBuffer)], 
        `${file.name.split('.')[0]}.webp`, 
        { type: 'image/webp' }
      )
    } else {
      // Для видео просто передаем как есть (можно добавить сжатие в будущем)
      finalFile = file
      
      console.log(
        `🎯 [MESSAGE VIDEO] Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      )
    }

    // Загружаем в Bunny Storage с типом 'messages'
    const uploadResult = await uploadToBunnyStorage(finalFile, 'messages')

    if (!uploadResult.success) {
      return NextResponse.json({ 
        error: uploadResult.error || 'Failed to upload message media' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl,
      previewUrl: uploadResult.previewUrl,
      type: isImage ? 'image' : 'video',
      originalSize: buffer.length,
      finalSize: finalFile.size
    })

  } catch (error) {
    console.error('Message media upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload message media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
