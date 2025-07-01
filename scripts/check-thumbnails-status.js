#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
}

async function main() {
  console.log(`${colors.cyan}=== Fonana Thumbnails Status Check ===${colors.reset}\n`)

  try {
    // Получаем статистику по thumbnails
    const allPosts = await prisma.post.count()
    const imagePosts = await prisma.post.count({
      where: { type: 'image' }
    })
    const videoPosts = await prisma.post.count({
      where: { type: 'video' }
    })
    
    // Проверяем битые thumbnails - расширенный список паттернов
    const brokenThumbnails = await prisma.post.findMany({
      where: {
        OR: [
          { thumbnail: { contains: 'thumb_.' } },    // thumb_.webp
          { thumbnail: { contains: 'thumb_/' } },    // thumb_/filename
          { thumbnail: 'thumb_' },                   // только thumb_
          { thumbnail: { endsWith: 'thumb_' } },     // путь заканчивается на thumb_
          { thumbnail: { contains: 'thumb__' } },    // двойное подчеркивание
          { thumbnail: { contains: '//' } },         // двойной слеш в пути
        ]
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        mediaUrl: true,
        type: true,
        createdAt: true
      }
    })
    
    // Проверяем посты без thumbnails (только изображения)
    const imagesWithoutThumbnails = await prisma.post.findMany({
      where: {
        type: 'image',
        thumbnail: null,
        mediaUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        mediaUrl: true
      },
      take: 10
    })
    
    // Проверяем посты с placeholder
    const postsWithPlaceholder = await prisma.post.count({
      where: {
        thumbnail: { contains: 'placeholder' }
      }
    })

    // Проверяем посты с неправильными расширениями
    const postsWithWrongExtensions = await prisma.post.findMany({
      where: {
        AND: [
          { thumbnail: { not: null } },
          { NOT: [
            { thumbnail: { endsWith: '.webp' } },
            { thumbnail: { endsWith: '.jpg' } },
            { thumbnail: { endsWith: '.jpeg' } },
            { thumbnail: { endsWith: '.png' } },
            { thumbnail: { endsWith: '.gif' } },
            { thumbnail: { contains: 'placeholder' } }
          ]}
        ]
      },
      select: {
        id: true,
        thumbnail: true
      }
    })

    // Вывод статистики
    console.log(`${colors.blue}=== General Statistics ===${colors.reset}`)
    console.log(`Total posts: ${allPosts}`)
    console.log(`Image posts: ${imagePosts}`)
    console.log(`Video posts: ${videoPosts}`)
    console.log()
    
    console.log(`${colors.yellow}=== Thumbnail Issues Summary ===${colors.reset}`)
    console.log(`${colors.red}Broken thumbnails: ${brokenThumbnails.length}${colors.reset}`)
    console.log(`Images without thumbnails: ${imagesWithoutThumbnails.length}`)
    console.log(`Posts with placeholder: ${postsWithPlaceholder}`)
    console.log(`Posts with wrong extensions: ${postsWithWrongExtensions.length}`)
    
    if (brokenThumbnails.length > 0) {
      console.log(`\n${colors.red}=== Broken Thumbnails Details ===${colors.reset}`)
      brokenThumbnails.slice(0, 10).forEach((post, index) => {
        console.log(`\n${index + 1}. Post: "${post.title}" (ID: ${post.id})`)
        console.log(`   Type: ${post.type}`)
        console.log(`   ${colors.red}Thumbnail: ${post.thumbnail}${colors.reset}`)
        console.log(`   MediaUrl: ${post.mediaUrl}`)
        console.log(`   Created: ${post.createdAt.toLocaleDateString()}`)
      })
      
      if (brokenThumbnails.length > 10) {
        console.log(`\n... and ${brokenThumbnails.length - 10} more broken thumbnails`)
      }
      
      // Показываем примеры битых путей
      const brokenPaths = [...new Set(brokenThumbnails.map(p => p.thumbnail))]
      console.log(`\n${colors.yellow}=== Unique Broken Patterns ===${colors.reset}`)
      brokenPaths.forEach(path => {
        const count = brokenThumbnails.filter(p => p.thumbnail === path).length
        console.log(`${colors.red}"${path}"${colors.reset} - ${count} posts`)
      })
    }

    if (imagesWithoutThumbnails.length > 0) {
      console.log(`\n${colors.magenta}=== Image Posts Without Thumbnails ===${colors.reset}`)
      imagesWithoutThumbnails.forEach((post, index) => {
        console.log(`${index + 1}. ID: ${post.id}, Title: "${post.title}"`)
        console.log(`   Media: ${post.mediaUrl}`)
      })
    }

    if (postsWithWrongExtensions.length > 0) {
      console.log(`\n${colors.magenta}=== Posts With Wrong Extensions ===${colors.reset}`)
      const wrongExtensions = [...new Set(postsWithWrongExtensions.map(p => {
        const match = p.thumbnail.match(/\.([^.]+)$/)
        return match ? match[1] : 'no-extension'
      }))]
      wrongExtensions.forEach(ext => {
        const count = postsWithWrongExtensions.filter(p => 
          ext === 'no-extension' ? !p.thumbnail.includes('.') : p.thumbnail.endsWith(`.${ext}`)
        ).length
        console.log(`Extension .${ext}: ${count} posts`)
      })
    }
    
    // Рекомендации
    const hasIssues = brokenThumbnails.length > 0 || imagesWithoutThumbnails.length > 0 || postsWithWrongExtensions.length > 0
    if (hasIssues) {
      console.log(`\n${colors.cyan}=== Recommendations ===${colors.reset}`)
      console.log(`1. Run the migration script to fix broken thumbnails:`)
      console.log(`   ${colors.green}node scripts/fix-thumbnails-migration.js${colors.reset}`)
      console.log(`2. Verify thumbnail generation in upload process`)
      console.log(`3. Check file permissions on server for thumb_ files`)
      console.log(`4. Monitor new posts for proper thumbnail generation`)
      console.log(`5. Review the upload process for edge cases`)
    } else {
      console.log(`\n${colors.green}✅ All thumbnails are in good state!${colors.reset}`)
    }

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error) 