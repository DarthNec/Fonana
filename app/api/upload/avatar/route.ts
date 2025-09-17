import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'
import sharp from 'sharp';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // читаем файл в буфер
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // сжимаем с помощью sharp
    const compressedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true }) // ограничим размеры
      .toFormat('webp', { quality: 80 }) // конвертируем в WebP и уменьшаем качество
      .toBuffer()

    console.log(
      `🎯 [AVATAR UPLOAD] Before: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, After: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`
    )

    // теперь грузим в Bunny
    const uploadResult = await uploadToBunnyStorage(
      new File([compressedBuffer], `${file.name.split('.')[0]}.webp`, { type: 'image/webp' }),
      'avatars'
    )

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload avatar' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      avatarUrl: uploadResult.fileUrl
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}