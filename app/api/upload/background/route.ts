import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Проверяем тип файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Проверяем размер (100MB max для фоновых изображений)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    // читаем файл в буфер
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // сжимаем с помощью sharp для фоновых изображений
    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // ограничим размеры для фона
      .toFormat('webp', { quality: 85 }) // конвертируем в WebP с хорошим качеством для фона
      .toBuffer()

    console.log(
      `🎯 [BACKGROUND UPLOAD] Before: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, After: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`
    )

    // теперь грузим в Bunny
    const uploadResult = await uploadToBunnyStorage(
      new File([new Uint8Array(compressedBuffer)], `${file.name.split('.')[0]}.webp`, { type: 'image/webp' }),
      'avatars' // используем папку avatars, так как backgrounds не поддерживается
    )

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload background' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      backgroundUrl: uploadResult.fileUrl
    })
  } catch (error) {
    console.error('Background upload error:', error)
    return NextResponse.json({ error: 'Failed to upload background' }, { status: 500 })
  }
} 