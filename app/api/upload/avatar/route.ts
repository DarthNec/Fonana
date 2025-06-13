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

    // Проверяем размер (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Создаем директорию если её нет
    const uploadDir = path.join(process.cwd(), 'public', 'avatars')
    
    // Создаем директорию синхронно с recursive
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Создаем уникальное имя файла
    const extension = file.type.split('/')[1]
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const filename = `avatar_${uniqueId}.${extension}`
    const filepath = path.join(uploadDir, filename)

    // Сохраняем файл
    await writeFile(filepath, buffer)
    const avatarUrl = `/avatars/${filename}`

    return NextResponse.json({ 
      success: true, 
      avatarUrl 
    })
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
} 