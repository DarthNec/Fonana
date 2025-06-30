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
  cyan: '\x1b[36m'
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
    
    // Проверяем битые thumbnails
    const brokenThumbnails = await prisma.post.findMany({
      where: {
        OR: [
          { thumbnail: { contains: 'thumb_.' } },
          { thumbnail: { contains: 'thumb_/' } },
          { thumbnail: 'thumb_' }
        ]
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        type: true,
        createdAt: true
      }
    })
    
    // Проверяем посты без thumbnails
    const postsWithoutThumbnails = await prisma.post.count({
      where: {
        type: 'image',
        thumbnail: null
      }
    })
    
    // Проверяем посты с placeholder
    const postsWithPlaceholder = await prisma.post.count({
      where: {
        thumbnail: { contains: 'placeholder' }
      }
    })

    // Вывод статистики
    console.log(`${colors.blue}=== General Statistics ===${colors.reset}`)
    console.log(`Total posts: ${allPosts}`)
    console.log(`Image posts: ${imagePosts}`)
    console.log(`Video posts: ${videoPosts}`)
    console.log()
    
    console.log(`${colors.yellow}=== Thumbnail Issues ===${colors.reset}`)
    console.log(`${colors.red}Broken thumbnails: ${brokenThumbnails.length}${colors.reset}`)
    console.log(`Posts without thumbnails: ${postsWithoutThumbnails}`)
    console.log(`Posts with placeholder: ${postsWithPlaceholder}`)
    
    if (brokenThumbnails.length > 0) {
      console.log(`\n${colors.red}=== Broken Thumbnails Details ===${colors.reset}`)
      brokenThumbnails.forEach((post, index) => {
        console.log(`\n${index + 1}. Post: "${post.title}" (ID: ${post.id})`)
        console.log(`   Type: ${post.type}`)
        console.log(`   Thumbnail: ${post.thumbnail}`)
        console.log(`   Created: ${post.createdAt.toLocaleDateString()}`)
      })
      
      // Показываем примеры битых путей
      const brokenPaths = [...new Set(brokenThumbnails.map(p => p.thumbnail))]
      console.log(`\n${colors.yellow}=== Unique Broken Paths ===${colors.reset}`)
      brokenPaths.forEach(path => {
        const count = brokenThumbnails.filter(p => p.thumbnail === path).length
        console.log(`"${path}" - ${count} posts`)
      })
    }
    
    // Рекомендации
    if (brokenThumbnails.length > 0 || postsWithoutThumbnails > 0) {
      console.log(`\n${colors.cyan}=== Recommendations ===${colors.reset}`)
      console.log(`1. Run the migration script to fix broken thumbnails:`)
      console.log(`   ${colors.green}node scripts/fix-thumbnails-migration.js${colors.reset}`)
      console.log(`2. Check upload process for potential issues`)
      console.log(`3. Monitor new posts for proper thumbnail generation`)
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