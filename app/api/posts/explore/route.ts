import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/posts/explore
 * 
 * Возвращает все данные для Explore страницы из explore_posts.json
 * 
 * Response:
 * {
 *   creators: [...],  // Ранжированные криэйторы
 *   posts: {
 *     all: [...],     // 750 последних постов
 *     paid: [...],    // Платные посты (isLocked + price > 0)
 *     premium: [...]  // Подписочные посты (isLocked + price null)
 *   },
 *   meta: { ... },
 *   statistics: { ... }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'explore_posts.json')
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { 
          error: 'Explore posts data not found. Please run: node export-explore-posts.js',
          creators: [],
          posts: {
            all: [],
            paid: [],
            premium: []
          }
        },
        { status: 404 }
      )
    }
    
    // Читаем и парсим JSON
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const exploreData = JSON.parse(fileContent)
    
    // Возвращаем данные
    return NextResponse.json(exploreData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Кэш на 1 час
      }
    })
    
  } catch (error) {
    console.error('[API] Error loading explore posts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load explore posts data',
        creators: [],
        posts: {
          all: [],
          paid: [],
          premium: []
        }
      },
      { status: 500 }
    )
  }
}
