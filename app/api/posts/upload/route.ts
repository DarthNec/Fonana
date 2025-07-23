import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import sharp from 'sharp'
import { generateVideoThumbnailAtPercentage } from '@/lib/utils/video-processor'

// 🔧 ФИКС M7: App Router body size configuration (Next.js 14 syntax)
export const maxDuration = 30 // Allow time for large file processing & Sharp optimization

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'image'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('Post media upload attempt:', {
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
      console.log('Invalid file type:', file.type)
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

    // Читаем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Генерируем уникальное имя файла
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const ext = path.extname(file.name)
    const fileName = `${hash}${ext}`

    // Определяем директорию для загрузки
    let uploadDir: string
    const mediaType = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio'
    
    if (process.env.NODE_ENV === 'production') {
      uploadDir = `/var/www/Fonana/public/posts/${mediaType}`
    } else {
      // Для локальной разработки используем путь относительно __dirname
      // В Next.js API routes __dirname указывает на .next/server/app/api/posts/upload
      // Поднимаемся на 6 уровней вверх к корню проекта
      const projectRoot = path.join(__dirname, '..', '..', '..', '..', '..', '..')
      uploadDir = path.join(projectRoot, 'public', 'posts', mediaType)
    }
    
    const filePath = path.join(uploadDir, fileName)

    console.log('Upload paths:', {
      uploadDir,
      filePath,
      __dirname: __dirname
    })

    // Создаем директорию если её нет
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('Directory created/verified:', uploadDir)
    } catch (err) {
      console.error('Error creating directory:', err)
    }

    // Проверяем существование директории еще раз
    if (!fs.existsSync(uploadDir)) {
      console.error('Directory does not exist after creation attempt:', uploadDir)
      throw new Error(`Directory does not exist: ${uploadDir}`)
    }

    // Сохраняем файл
    try {
      await writeFile(filePath, buffer)
      console.log('File saved:', filePath)
      
      // Если это изображение, создаем оптимизированную версию
      if (type === 'image') {
        const optimizedFileName = `thumb_${fileName}`
        const optimizedPath = path.join(uploadDir, optimizedFileName)
        
        try {
          // Создаем оптимизированную версию: 
          // - максимум 800px по ширине
          // - конвертируем в webp для лучшего сжатия
          // - качество 85%
          await sharp(buffer)
            .resize(800, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 85 })
            .toFile(optimizedPath.replace(ext, '.webp'))
          
          console.log('Optimized image created:', optimizedPath)
          
          // Также создаем миниатюру для превью (300px)
          const previewFileName = `preview_${fileName}`
          const previewPath = path.join(uploadDir, previewFileName)
          
          await sharp(buffer)
            .resize(300, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .webp({ quality: 80 })
            .toFile(previewPath.replace(ext, '.webp'))
            
          console.log('Preview image created:', previewPath)
        } catch (optimizeError) {
          console.error('Error optimizing image:', optimizeError)
          // Продолжаем даже если оптимизация не удалась
        }
      }
      
      // Если это видео, пытаемся извлечь кадр
      if (type === 'video') {
        const thumbFileName = `thumb_${hash}.jpg`
        const thumbPath = path.join(uploadDir, thumbFileName)
        
        console.log('Attempting to extract video thumbnail...')
        
        // Пытаемся извлечь кадр на 10% длительности видео
        const thumbnailExtracted = await generateVideoThumbnailAtPercentage(
          filePath,
          thumbPath,
          10 // 10% of video duration
        )
        
        if (thumbnailExtracted) {
          console.log('Video thumbnail extracted successfully')
          
          // Оптимизируем извлеченный кадр
          try {
            const optimizedThumbPath = path.join(uploadDir, `thumb_${hash}.webp`)
            await sharp(thumbPath)
              .resize(800, null, { 
                withoutEnlargement: true,
                fit: 'inside'
              })
              .webp({ quality: 85 })
              .toFile(optimizedThumbPath)
              
            // Удаляем оригинальный jpg
            await fs.promises.unlink(thumbPath)
            console.log('Video thumbnail optimized')
          } catch (optimizeError) {
            console.error('Error optimizing video thumbnail:', optimizeError)
          }
        }
      }
    } catch (writeError) {
      console.error('Error writing file:', writeError)
      throw writeError
    }

    // Возвращаем URL файла - для изображений используем WebP!
    const fileUrl = type === 'image' 
      ? `/posts/${mediaType}/thumb_${fileName.replace(ext, '.webp')}` 
      : `/posts/${mediaType}/${fileName}`
    let thumbUrl = type === 'image' ? `/posts/${mediaType}/thumb_${fileName.replace(ext, '.webp')}` : null
    let previewUrl = type === 'image' ? `/posts/${mediaType}/preview_${fileName.replace(ext, '.webp')}` : null

    // Для видео проверяем, был ли создан тумбнейл
    if (type === 'video') {
      const videoThumbPath = `/posts/${mediaType}/thumb_${hash}.webp`
      const videoThumbFile = path.join(uploadDir, `thumb_${hash}.webp`)
      
      // Проверяем существование файла тумбнейла
      if (fs.existsSync(videoThumbFile)) {
        thumbUrl = videoThumbPath
        previewUrl = videoThumbPath
      } else {
        // Fallback на enhanced placeholder если не удалось извлечь кадр
        thumbUrl = '/placeholder-video-enhanced.png'
        previewUrl = '/placeholder-video-enhanced.png'
      }
    }

    return NextResponse.json({ 
      url: fileUrl,
      thumbUrl,
      previewUrl,
      fileName,
      type: file.type,
      size: file.size 
    })

  } catch (error) {
    console.error('Error uploading post media:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 