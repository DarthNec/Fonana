import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { ENV } from '@/lib/constants/env'

export async function POST(request: NextRequest) {
  try {
    // Проверяем JWT токен (опционально для загрузки)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      try {
        jwt.verify(token, ENV.NEXTAUTH_SECRET)
      } catch (error) {
        console.log('Invalid JWT token in upload, proceeding anyway')
      }
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'avatar', 'background', 'post', 'message'
    
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    console.log('File upload attempt:', {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadType: type
    })

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json({ 
        error: 'Недопустимый тип файла. Разрешены: JPG, PNG, GIF, WEBP' 
      }, { status: 400 })
    }

    // Проверяем размер файла (максимум 5MB для аватарок и фонов, 10MB для постов и сообщений)
    const maxSize = (type === 'avatar' || type === 'background') ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `Файл слишком большой. Максимальный размер: ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Создаем уникальное имя файла
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Генерируем уникальное имя файла
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex')
    const fileExtension = path.extname(file.name)
    const fileName = `${fileHash}${fileExtension}`
    
    // Определяем директорию для загрузки в зависимости от типа
    let uploadSubDir: string
    switch (type) {
      case 'avatar':
        uploadSubDir = 'media/avatars'
        break
      case 'background':
        uploadSubDir = 'media/backgrounds'
        break
      case 'post':
        uploadSubDir = 'posts/images'
        break
      case 'message':
      case 'image': // для обратной совместимости
      case 'video':
        uploadSubDir = 'messages'
        break
      default:
        uploadSubDir = 'uploads' // общая директория по умолчанию
    }
    
    // Определяем полный путь
    let uploadDir: string
    if (process.env.NODE_ENV === 'production') {
      uploadDir = `/var/www/Fonana/public/${uploadSubDir}`
    } else {
      // Для локальной разработки используем путь относительно корня проекта
      const projectRoot = path.join(process.cwd(), 'public')
      uploadDir = path.join(projectRoot, uploadSubDir)
    }
    
    const filePath = path.join(uploadDir, fileName)
    
    console.log('Upload directory:', uploadDir)
    console.log('File path:', filePath)
    console.log('Upload type:', type)
    
    try {
      await mkdir(uploadDir, { recursive: true })
      console.log('Directory created/verified')
      
      // Сохраняем файл
      await writeFile(filePath, buffer)
      console.log('File written successfully:', fileName)
      
    } catch (error) {
      console.error('File operation error:', error)
      throw error
    }
    
    // Возвращаем URL файла
    const fileUrl = `/${uploadSubDir}/${fileName}`
    
    return NextResponse.json({ 
      success: true,
      url: fileUrl,
      filename: fileName,
      uploadType: type || 'general'
    })
    
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      error: 'Ошибка при загрузке файла',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 