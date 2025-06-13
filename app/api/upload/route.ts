import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('File upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Недопустимый тип файла. Разрешены: JPG, PNG, GIF, WEBP' 
      }, { status: 400 })
    }

    // Проверяем размер файла (максимум 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Файл слишком большой. Максимальный размер: 5MB' 
      }, { status: 400 })
    }

    // Создаем уникальное имя файла
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Генерируем уникальное имя файла
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex')
    const fileExtension = path.extname(file.name)
    const fileName = `${fileHash}${fileExtension}`
    
    // Определяем директорию для загрузки
    // В development используем путь относительно корня проекта
    let uploadDir: string
    if (process.env.NODE_ENV === 'production') {
      uploadDir = '/var/www/fonana/public/avatars'
    } else {
      // Для локальной разработки используем путь относительно корня проекта
      // __dirname в Next.js API routes указывает на .next/server/app/api/upload
      // Нужно подняться на 4 уровня вверх чтобы попасть в корень проекта
      const projectRoot = path.join(__dirname, '..', '..', '..', '..')
      uploadDir = path.join(projectRoot, 'public', 'avatars')
    }
    
    const filePath = path.join(uploadDir, fileName)
    
    console.log('Upload directory:', uploadDir)
    console.log('File path:', filePath)
    console.log('__dirname:', __dirname)
    console.log('process.cwd():', process.cwd())
    console.log('Environment:', process.env.NODE_ENV)
    
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('Directory created/verified')
      
      // Сохраняем файл
      await writeFile(filePath, buffer)
      console.log('File written successfully:', fileName)
      
      // Проверяем что файл создался
      const fs = require('fs')
      const exists = fs.existsSync(filePath)
      console.log('File exists after write:', exists)
      
    } catch (error) {
      console.error('File operation error:', error)
      throw error
    }
    
    // Возвращаем URL файла
    const fileUrl = `/avatars/${fileName}`
    
    return NextResponse.json({ 
      success: true,
      url: fileUrl,
      filename: fileName,
      debug: {
        uploadDir,
        filePath,
        fileSize: buffer.length
      }
    })
    
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 