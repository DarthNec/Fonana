import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('Avatar upload started')
  
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      console.error('No file received in request')
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Проверяем тип файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Проверяем размер (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size)
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Определяем директорию для загрузки
    let uploadDir: string
    
    if (process.env.NODE_ENV === 'production') {
      uploadDir = '/var/www/Fonana/public/media/avatars'
    } else {
      // Для локальной разработки используем __dirname и path.resolve
      // В Next.js API routes process.cwd() может быть неправильным
      uploadDir = path.resolve('./public/media/avatars')
      console.log('Upload directory (resolved):', uploadDir)
    }
    
    console.log('Upload directory:', uploadDir)
    
    // Создаем директорию синхронно с recursive
    try {
      if (!existsSync(uploadDir)) {
        console.log('Creating directory:', uploadDir)
        mkdirSync(uploadDir, { recursive: true })
      }
    } catch (dirError) {
      console.error('Error creating directory:', dirError)
      throw new Error(`Failed to create upload directory: ${dirError}`)
    }

    // Создаем уникальное имя файла
    const extension = file.type.split('/')[1]
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const filename = `avatar_${uniqueId}.${extension}`
    const filepath = path.join(uploadDir, filename)
    console.log('Saving file to:', filepath)

    // Сохраняем файл
    try {
      await writeFile(filepath, buffer)
      console.log('File saved successfully')
    } catch (writeError) {
      console.error('Error writing file:', writeError)
      throw new Error(`Failed to write file: ${writeError}`)
    }
    
    const avatarUrl = `/media/avatars/${filename}`
    console.log('Avatar URL:', avatarUrl)

    return NextResponse.json({ 
      success: true, 
      avatarUrl 
    })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to upload avatar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 