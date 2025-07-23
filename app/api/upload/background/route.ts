import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Определяем директорию для загрузки
    let uploadDir: string
    
    if (process.env.NODE_ENV === 'production') {
      uploadDir = '/var/www/Fonana/public/media/backgrounds'
    } else {
      // Для локальной разработки используем путь относительно корня проекта
      uploadDir = path.join(process.cwd(), 'public', 'media', 'backgrounds')
    }
    
    // Создаем директорию синхронно с recursive
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Создаем уникальное имя файла
    const extension = file.type.split('/')[1]
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const filename = `bg_${uniqueId}.${extension}`
    const filepath = path.join(uploadDir, filename)

    // Сохраняем файл
    await writeFile(filepath, buffer)
    const backgroundUrl = `/media/backgrounds/${filename}`

    return NextResponse.json({ 
      success: true, 
      backgroundUrl 
    })
  } catch (error) {
    console.error('Error uploading background:', error)
    return NextResponse.json(
      { error: 'Failed to upload background' },
      { status: 500 }
    )
  }
} 