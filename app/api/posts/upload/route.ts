import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import sharp from 'sharp'

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
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024, // 50MB
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
      uploadDir = `/var/www/fonana/public/posts/${mediaType}`
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
    } catch (writeError) {
      console.error('Error writing file:', writeError)
      throw writeError
    }

    // Возвращаем URL файла
    const fileUrl = `/posts/${mediaType}/${fileName}`
    let thumbUrl = type === 'image' ? `/posts/${mediaType}/thumb_${fileName.replace(ext, '.webp')}` : null
    let previewUrl = type === 'image' ? `/posts/${mediaType}/preview_${fileName.replace(ext, '.webp')}` : null

    // Для видео используем enhanced placeholder
    if (type === 'video') {
      thumbUrl = '/placeholder-video-enhanced.png'
      previewUrl = '/placeholder-video-enhanced.png'
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