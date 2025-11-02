import { NextRequest, NextResponse } from 'next/server'
import { uploadToBunnyStorage } from '@/lib/utils/bunny-upload'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)

// 🔧 ФИКС M7: App Router body size configuration (Next.js 14 syntax)
export const maxDuration = 30 // Allow time for large file processing

/**
 * Извлекает первый кадр из видео и создает превью
 */
async function extractVideoFrame(videoFile: File): Promise<Buffer | null> {
  const tempDir = path.join(process.cwd(), 'temp_uploads')
  
  // Создаем временную директорию если её нет
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const tempVideoPath = path.join(tempDir, `video_${Date.now()}.mp4`)
  const tempFramePath = path.join(tempDir, `frame_${Date.now()}.png`)
  
  try {
    // Сохраняем видео во временный файл
    const arrayBuffer = await videoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(tempVideoPath, buffer)
    
    console.log('🎯 [VIDEO PREVIEW] Extracting first frame from video...')
    
    // Извлекаем первый кадр с помощью ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .screenshots({
          timestamps: ['00:00:00.001'], // Первый кадр
          filename: path.basename(tempFramePath),
          folder: tempDir,
          size: '1920x?', // Сохраняем соотношение сторон
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
    })
    
    // Читаем созданный кадр
    const frameBuffer = fs.readFileSync(tempFramePath)
    
    // Конвертируем в WebP с хорошим качеством
    const webpBuffer = await sharp(frameBuffer)
      .webp({ quality: 85 })
      .toBuffer()
    
    console.log('🎯 [VIDEO PREVIEW] Frame extracted and converted to WebP:', {
      originalSize: `${(frameBuffer.length / 1024).toFixed(2)} KB`,
      webpSize: `${(webpBuffer.length / 1024).toFixed(2)} KB`
    })
    
    // Удаляем временные файлы
    await unlink(tempVideoPath)
    await unlink(tempFramePath)
    
    return webpBuffer
    
  } catch (error) {
    console.error('🎯 [VIDEO PREVIEW] Failed to extract frame:', error)
    
    // Очистка временных файлов при ошибке
    try {
      if (fs.existsSync(tempVideoPath)) await unlink(tempVideoPath)
      if (fs.existsSync(tempFramePath)) await unlink(tempFramePath)
    } catch (cleanupError) {
      console.error('🎯 [VIDEO PREVIEW] Cleanup error:', cleanupError)
    }
    
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'image'
    const accessType = formData.get('accessType') as string || 'free'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('🎯 [BUNNY UPLOAD API] Post media upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      contentType: type,
      accessType
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

    // Конвертируем изображения в WebP перед загрузкой (кроме GIF)
    let fileToUpload: File = file
    if (type === 'image' && file.type !== 'image/gif') {
      try {
        console.log('🎯 [BUNNY UPLOAD API] Converting image to WebP...')
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Конвертируем в WebP с качеством 85%
        const webpBuffer = await sharp(buffer)
          .webp({ quality: 85 })
          .toBuffer()
        
        const originalSize = file.size
        const webpSize = webpBuffer.length
        const savings = ((originalSize - webpSize) / originalSize * 100).toFixed(2)
        
        console.log('🎯 [BUNNY UPLOAD API] WebP conversion successful:', {
          originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
          webpSize: `${(webpSize / 1024).toFixed(2)} KB`,
          savings: `${savings}%`
        })
        
        // Создаем новый File объект с WebP данными
        const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' })
        const originalName = file.name.replace(/\.[^/.]+$/, '')
        fileToUpload = new File([webpBlob], `${originalName}.webp`, { type: 'image/webp' })
        
      } catch (conversionError) {
        console.error('🎯 [BUNNY UPLOAD API] WebP conversion failed, using original:', conversionError)
        // Если конвертация не удалась, используем оригинальный файл
      }
    }

    // Загружаем файл в BunnyStorage
    const uploadResult = await uploadToBunnyStorage(fileToUpload, type as 'image' | 'video' | 'audio')

    if (!uploadResult.success) {
      console.error('🎯 [BUNNY UPLOAD API] Upload failed:', uploadResult.error)
      return NextResponse.json({ 
        error: uploadResult.error || 'Ошибка загрузки файла' 
      }, { status: 500 })
    }

    // Для видео создаем превью из первого кадра
    let videoPreviewUrl: string | undefined
    if (type === 'video') {
      try {
        console.log('🎯 [BUNNY UPLOAD API] Creating video preview from first frame...')
        
        const frameBuffer = await extractVideoFrame(file)
        
        if (frameBuffer) {
          // Создаем File объект для превью
          const previewBlob = new Blob([new Uint8Array(frameBuffer)], { type: 'image/webp' })
          const originalName = file.name.replace(/\.[^/.]+$/, '')
          const previewFile = new File([previewBlob], `${originalName}_preview.webp`, { type: 'image/webp' })
          
          // Загружаем превью в posts/videos/preview папку
          const previewUploadResult = await uploadToBunnyStorage(previewFile, 'video-preview')
          
          if (previewUploadResult.success && previewUploadResult.fileUrl) {
            videoPreviewUrl = previewUploadResult.fileUrl
            console.log('🎯 [BUNNY UPLOAD API] Video preview uploaded:', videoPreviewUrl)
          } else {
            console.error('🎯 [BUNNY UPLOAD API] Failed to upload video preview:', previewUploadResult.error)
          }
        }
        
      } catch (previewError) {
        console.error('🎯 [BUNNY UPLOAD API] Video preview creation failed:', previewError)
        // Не прерываем процесс если preview не удался
      }
    }

    // Для изображений создаем сильно размытую копию ТОЛЬКО если контент платный
    let blurUrl: string | undefined
    const needsBlur = type === 'image' && accessType !== 'free'
    
    if (needsBlur) {
      try {
        console.log('🎯 [BUNNY UPLOAD API] Creating blurred version for paid content...')
        
        const arrayBuffer = await fileToUpload.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Создаем МАКСИМАЛЬНО размытую версию
        // 1. Уменьшаем размер до 20% для более быстрого blur
        // 2. Применяем очень сильный blur (sigma 50)
        // 3. Уменьшаем качество до 60%
        const blurredBuffer = await sharp(buffer)
          .resize({ width: 400 }) // Уменьшаем для более быстрого blur
          .blur(30) // Максимальный blur (sigma)
          .webp({ quality: 60 })
          .toBuffer()
        
        console.log('🎯 [BUNNY UPLOAD API] Blurred image created:', {
          originalSize: `${(buffer.length / 1024).toFixed(2)} KB`,
          blurredSize: `${(blurredBuffer.length / 1024).toFixed(2)} KB`
        })
        
        // Создаем File объект для размытого изображения
        const blurredBlob = new Blob([new Uint8Array(blurredBuffer)], { type: 'image/webp' })
        const originalName = fileToUpload.name.replace(/\.[^/.]+$/, '')
        const blurredFile = new File([blurredBlob], `${originalName}_blur.webp`, { type: 'image/webp' })
        
        // Загружаем размытую версию в posts/blur папку
        const blurUploadResult = await uploadToBunnyStorage(blurredFile, 'blur')
        
        if (blurUploadResult.success && blurUploadResult.fileUrl) {
          blurUrl = blurUploadResult.fileUrl
          console.log('🎯 [BUNNY UPLOAD API] Blurred version uploaded:', blurUrl)
        } else {
          console.error('🎯 [BUNNY UPLOAD API] Failed to upload blurred version:', blurUploadResult.error)
        }
        
      } catch (blurError) {
        console.error('🎯 [BUNNY UPLOAD API] Blur creation failed:', blurError)
        // Не прерываем процесс если blur не удался
      }
    } else if (type === 'image' && accessType === 'free') {
      console.log('🎯 [BUNNY UPLOAD API] Skipping blur creation for free content')
    }

    console.log('🎯 [BUNNY UPLOAD API] Upload successful:', {
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl,
      previewUrl: uploadResult.previewUrl,
      videoPreviewUrl,
      blurUrl
    })
    
    // Формируем итоговый previewUrl в зависимости от типа контента
    let finalPreviewUrl: string | undefined
    if (type === 'video') {
      // Для видео используем только videoPreviewUrl (превью из первого кадра)
      finalPreviewUrl = videoPreviewUrl
    } else if (type === 'image') {
      // Для изображений используем uploadResult.previewUrl или сам файл
      finalPreviewUrl = uploadResult.previewUrl || uploadResult.fileUrl
    } else {
      // Для остальных типов не устанавливаем preview
      finalPreviewUrl = undefined
    }
    
    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      thumbUrl: uploadResult.thumbUrl,
      previewUrl: finalPreviewUrl, // Правильный previewUrl в зависимости от типа
      videoPreviewUrl: videoPreviewUrl || undefined, // Превью из первого кадра видео (deprecated, используйте previewUrl)
      blurUrl
    })

  } catch (error) {
    console.error('🎯 [BUNNY UPLOAD API] Error uploading post media:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 