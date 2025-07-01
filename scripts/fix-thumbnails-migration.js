#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient()

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

/**
 * Проверяет валидность thumbnail пути
 */
function isValidThumbnail(thumbnail) {
  if (!thumbnail) return false
  
  // Проверяем на битые пути
  if (thumbnail.includes('thumb_.')) return false
  if (thumbnail.includes('thumb_/')) return false
  if (thumbnail === 'thumb_') return false
  if (thumbnail.endsWith('thumb_')) return false
  if (thumbnail.includes('thumb__')) return false
  if (thumbnail.includes('//')) return false
  
  // Проверяем на пустое имя файла после thumb_
  const thumbMatch = thumbnail.match(/thumb_([^/]+)\.(webp|jpg|png|gif)/)
  if (thumbMatch && (!thumbMatch[1] || thumbMatch[1].length === 0)) {
    return false
  }
  
  return true
}

/**
 * Генерирует правильный путь к thumbnail
 */
function generateThumbnailPath(mediaUrl, type) {
  if (!mediaUrl) return null
  
  // Для видео и аудио используем placeholder
  if (type === 'video') return '/placeholder-video-enhanced.png'
  if (type === 'audio') return '/placeholder-audio.png'
  
  // Для изображений генерируем thumb путь
  const lastSlash = mediaUrl.lastIndexOf('/')
  const lastDot = mediaUrl.lastIndexOf('.')
  
  if (lastSlash === -1 || lastDot === -1 || lastDot <= lastSlash) {
    console.warn(`Invalid mediaUrl format: ${mediaUrl}`)
    return null
  }
  
  const dirPath = mediaUrl.substring(0, lastSlash)
  const fileName = mediaUrl.substring(lastSlash + 1)
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  
  if (!nameWithoutExt || nameWithoutExt.trim() === '') {
    console.warn(`Empty filename in: ${mediaUrl}`)
    return null
  }
  
  return `${dirPath}/thumb_${nameWithoutExt}.webp`
}

async function main() {
  console.log(`${colors.cyan}=== Fonana Thumbnails Migration ===${colors.reset}\n`)

  try {
    // Находим все посты с битыми thumbnails
    const brokenPosts = await prisma.post.findMany({
      where: {
        OR: [
          { thumbnail: { contains: 'thumb_.' } },
          { thumbnail: { contains: 'thumb_/' } },
          { thumbnail: 'thumb_' },
          { thumbnail: { endsWith: 'thumb_' } },
          { thumbnail: { contains: 'thumb__' } },
          { thumbnail: { contains: '//' } },
        ]
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        mediaUrl: true,
        type: true
      }
    })

    // Находим изображения без thumbnails
    const imagesWithoutThumbnails = await prisma.post.findMany({
      where: {
        type: 'image',
        thumbnail: null,
        mediaUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        mediaUrl: true,
        type: true
      }
    })

    console.log(`Found ${colors.red}${brokenPosts.length}${colors.reset} posts with broken thumbnails`)
    console.log(`Found ${colors.yellow}${imagesWithoutThumbnails.length}${colors.reset} images without thumbnails\n`)

    if (brokenPosts.length === 0 && imagesWithoutThumbnails.length === 0) {
      console.log(`${colors.green}✅ No issues to fix!${colors.reset}`)
      return
    }

    // Запрашиваем подтверждение
    console.log(`${colors.yellow}This will update ${brokenPosts.length + imagesWithoutThumbnails.length} posts.${colors.reset}`)
    console.log('Press Ctrl+C to cancel or Enter to continue...')
    
    await new Promise(resolve => {
      process.stdin.once('data', resolve)
    })

    let fixedCount = 0
    let failedCount = 0

    // Исправляем битые thumbnails
    console.log(`\n${colors.cyan}Fixing broken thumbnails...${colors.reset}`)
    for (const post of brokenPosts) {
      try {
        const newThumbnail = generateThumbnailPath(post.mediaUrl, post.type)
        
        if (newThumbnail && isValidThumbnail(newThumbnail)) {
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: newThumbnail }
          })
          console.log(`${colors.green}✓${colors.reset} Fixed: "${post.title}" (${post.id})`)
          console.log(`  Old: ${colors.red}${post.thumbnail}${colors.reset}`)
          console.log(`  New: ${colors.green}${newThumbnail}${colors.reset}`)
          fixedCount++
        } else {
          // Если не можем сгенерировать валидный thumbnail, используем placeholder
          const placeholder = post.type === 'video' ? '/placeholder-video-enhanced.png' : 
                            post.type === 'audio' ? '/placeholder-audio.png' : 
                            '/placeholder-image.png'
          
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: placeholder }
          })
          console.log(`${colors.yellow}⚠${colors.reset} Used placeholder for: "${post.title}" (${post.id})`)
          fixedCount++
        }
      } catch (error) {
        console.error(`${colors.red}✗${colors.reset} Failed to fix post ${post.id}: ${error.message}`)
        failedCount++
      }
    }

    // Добавляем thumbnails для изображений без них
    console.log(`\n${colors.cyan}Adding thumbnails to images...${colors.reset}`)
    for (const post of imagesWithoutThumbnails) {
      try {
        const newThumbnail = generateThumbnailPath(post.mediaUrl, 'image')
        
        if (newThumbnail && isValidThumbnail(newThumbnail)) {
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: newThumbnail }
          })
          console.log(`${colors.green}✓${colors.reset} Added thumbnail for: "${post.title}" (${post.id})`)
          console.log(`  Thumbnail: ${colors.green}${newThumbnail}${colors.reset}`)
          fixedCount++
        } else {
          // Используем оригинал как thumbnail если не можем сгенерировать
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: post.mediaUrl }
          })
          console.log(`${colors.yellow}⚠${colors.reset} Used original as thumbnail for: "${post.title}" (${post.id})`)
          fixedCount++
        }
      } catch (error) {
        console.error(`${colors.red}✗${colors.reset} Failed to add thumbnail for post ${post.id}: ${error.message}`)
        failedCount++
      }
    }

    // Итоговая статистика
    console.log(`\n${colors.cyan}=== Migration Complete ===${colors.reset}`)
    console.log(`${colors.green}Successfully fixed: ${fixedCount} posts${colors.reset}`)
    if (failedCount > 0) {
      console.log(`${colors.red}Failed: ${failedCount} posts${colors.reset}`)
    }

    // Проверяем остались ли проблемы
    const remainingBroken = await prisma.post.count({
      where: {
        OR: [
          { thumbnail: { contains: 'thumb_.' } },
          { thumbnail: { contains: 'thumb_/' } },
          { thumbnail: 'thumb_' },
          { thumbnail: { endsWith: 'thumb_' } },
          { thumbnail: { contains: 'thumb__' } },
          { thumbnail: { contains: '//' } },
        ]
      }
    })

    if (remainingBroken > 0) {
      console.log(`\n${colors.yellow}⚠ Warning: ${remainingBroken} posts still have broken thumbnails${colors.reset}`)
      console.log('These may require manual intervention.')
    } else {
      console.log(`\n${colors.green}✅ All thumbnail issues have been resolved!${colors.reset}`)
    }

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
  console.log('\n\nMigration cancelled by user')
  await prisma.$disconnect()
  process.exit(0)
})

main().catch(console.error) 