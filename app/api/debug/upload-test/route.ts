import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readdirSync, statSync } from 'fs'
import path from 'path'
import os from 'os'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const uploadDirs = {
      avatars: path.join(process.cwd(), 'public', 'avatars'),
      backgrounds: path.join(process.cwd(), 'public', 'backgrounds'),
      posts: path.join(process.cwd(), 'public', 'posts')
    }

    const diagnostics: any = {
      platform: os.platform(),
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
      },
      directories: {}
    }

    // Проверяем каждую директорию
    for (const [name, dirPath] of Object.entries(uploadDirs)) {
      const dirInfo: any = {
        path: dirPath,
        exists: existsSync(dirPath),
        files: []
      }

      if (dirInfo.exists) {
        try {
          const stats = statSync(dirPath)
          dirInfo.isDirectory = stats.isDirectory()
          dirInfo.permissions = stats.mode.toString(8)
          
          // Получаем список файлов
          const files = readdirSync(dirPath)
          dirInfo.fileCount = files.length
          
          // Показываем первые 5 файлов
          dirInfo.files = files.slice(0, 5).map(file => {
            const filePath = path.join(dirPath, file)
            const fileStats = statSync(filePath)
            return {
              name: file,
              size: fileStats.size,
              modified: fileStats.mtime
            }
          })
        } catch (err) {
          dirInfo.error = err instanceof Error ? err.message : 'Unknown error'
        }
      }

      diagnostics.directories[name] = dirInfo
    }

    // Тест записи
    diagnostics.writeTest = {}
    const testDir = uploadDirs.avatars
    if (existsSync(testDir)) {
      try {
        const testFile = path.join(testDir, '.write-test')
        require('fs').writeFileSync(testFile, 'test')
        require('fs').unlinkSync(testFile)
        diagnostics.writeTest.avatars = 'SUCCESS'
      } catch (err) {
        diagnostics.writeTest.avatars = err instanceof Error ? err.message : 'FAILED'
      }
    }

    return NextResponse.json(diagnostics, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 