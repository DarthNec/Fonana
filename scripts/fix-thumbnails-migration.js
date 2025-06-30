#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')

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

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function extractValidThumbnail(mediaUrl) {
  if (!mediaUrl) return null
  
  // Проверяем, что это изображение в нашей системе
  if (!mediaUrl.includes('/posts/images/') && !mediaUrl.includes('/posts/')) return null
  
  const lastSlashIndex = mediaUrl.lastIndexOf('/')
  const lastDotIndex = mediaUrl.lastIndexOf('.')
  
  // Если нет слеша или точки, возвращаем null
  if (lastSlashIndex === -1 || lastDotIndex === -1 || lastDotIndex <= lastSlashIndex) {
    return null
  }
  
  const dirPath = mediaUrl.substring(0, lastSlashIndex)
  const fileName = mediaUrl.substring(lastSlashIndex + 1)
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  
  // Если имя файла пустое, возвращаем null
  if (!nameWithoutExt) {
    return null
  }
  
  return `${dirPath}/thumb_${nameWithoutExt}.webp`
}

async function main() {
  console.log(`${colors.cyan}=== Fonana Thumbnails Migration Script ===${colors.reset}\n`)

  try {
    // Получаем все посты
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        mediaUrl: true,
        thumbnail: true,
        type: true
      }
    })

    console.log(`${colors.blue}Found ${posts.length} posts to check${colors.reset}\n`)

    let stats = {
      total: posts.length,
      imagesChecked: 0,
      videosChecked: 0,
      brokenThumbnails: 0,
      fixedThumbnails: 0,
      noMediaUrl: 0,
      errors: 0
    }

    const brokenPosts = []
    const fixedPosts = []

    for (const post of posts) {
      // Пропускаем посты без медиа
      if (!post.mediaUrl) {
        stats.noMediaUrl++
        continue
      }

      // Проверяем только изображения
      if (post.type === 'image') {
        stats.imagesChecked++
        
        // Проверяем текущий thumbnail
        if (post.thumbnail) {
          // Проверяем на битые пути (thumb_.webp, thumb_.jpg, etc)
          if (post.thumbnail.includes('thumb_.') || post.thumbnail.includes('thumb_/')) {
            console.log(`${colors.red}❌ Broken thumbnail found: Post "${post.title}" (ID: ${post.id})${colors.reset}`)
            console.log(`   Current: ${post.thumbnail}`)
            stats.brokenThumbnails++
            brokenPosts.push({
              id: post.id,
              title: post.title,
              thumbnail: post.thumbnail,
              mediaUrl: post.mediaUrl
            })
            
            // Пытаемся исправить
            const validThumbnail = extractValidThumbnail(post.mediaUrl)
            if (validThumbnail) {
              console.log(`   ${colors.green}✓ Fixed to: ${validThumbnail}${colors.reset}`)
              
              // Обновляем в базе
              await prisma.post.update({
                where: { id: post.id },
                data: { thumbnail: validThumbnail }
              })
              
              stats.fixedThumbnails++
              fixedPosts.push({
                id: post.id,
                title: post.title,
                oldThumbnail: post.thumbnail,
                newThumbnail: validThumbnail
              })
            } else {
              console.log(`   ${colors.yellow}⚠ Could not generate valid thumbnail${colors.reset}`)
              
              // Очищаем битый thumbnail
              await prisma.post.update({
                where: { id: post.id },
                data: { thumbnail: null }
              })
            }
          } else {
            // Проверяем существование файла thumbnail
            const publicPath = `/var/www/fonana/public${post.thumbnail}`
            const exists = await checkFileExists(publicPath)
            
            if (!exists && !post.thumbnail.includes('placeholder')) {
              console.log(`${colors.yellow}⚠ Missing thumbnail file: Post "${post.title}" (ID: ${post.id})${colors.reset}`)
              console.log(`   Path: ${post.thumbnail}`)
              
              // Генерируем новый путь
              const validThumbnail = extractValidThumbnail(post.mediaUrl)
              if (validThumbnail && validThumbnail !== post.thumbnail) {
                console.log(`   ${colors.green}✓ Updated to: ${validThumbnail}${colors.reset}`)
                
                await prisma.post.update({
                  where: { id: post.id },
                  data: { thumbnail: validThumbnail }
                })
                
                stats.fixedThumbnails++
              }
            }
          }
        } else if (post.mediaUrl) {
          // Если нет thumbnail, но есть mediaUrl для изображения
          const validThumbnail = extractValidThumbnail(post.mediaUrl)
          if (validThumbnail) {
            console.log(`${colors.blue}ℹ Adding thumbnail for: Post "${post.title}" (ID: ${post.id})${colors.reset}`)
            console.log(`   New: ${validThumbnail}`)
            
            await prisma.post.update({
              where: { id: post.id },
              data: { thumbnail: validThumbnail }
            })
            
            stats.fixedThumbnails++
          }
        }
      } else if (post.type === 'video') {
        stats.videosChecked++
        
        // Для видео проверяем только битые пути
        if (post.thumbnail && (post.thumbnail.includes('thumb_.') || post.thumbnail.includes('thumb_/'))) {
          console.log(`${colors.red}❌ Broken video thumbnail: Post "${post.title}" (ID: ${post.id})${colors.reset}`)
          console.log(`   Current: ${post.thumbnail}`)
          
          // Устанавливаем placeholder для видео
          await prisma.post.update({
            where: { id: post.id },
            data: { thumbnail: '/placeholder-video-enhanced.png' }
          })
          
          stats.fixedThumbnails++
        }
      }
    }

    // Итоговая статистика
    console.log(`\n${colors.cyan}=== Migration Summary ===${colors.reset}`)
    console.log(`Total posts: ${stats.total}`)
    console.log(`Images checked: ${stats.imagesChecked}`)
    console.log(`Videos checked: ${stats.videosChecked}`)
    console.log(`Posts without media: ${stats.noMediaUrl}`)
    console.log(`${colors.red}Broken thumbnails found: ${stats.brokenThumbnails}${colors.reset}`)
    console.log(`${colors.green}Thumbnails fixed: ${stats.fixedThumbnails}${colors.reset}`)
    
    if (brokenPosts.length > 0) {
      console.log(`\n${colors.yellow}=== Broken Posts Details ===${colors.reset}`)
      console.log(JSON.stringify(brokenPosts, null, 2))
    }
    
    if (fixedPosts.length > 0) {
      console.log(`\n${colors.green}=== Fixed Posts Details ===${colors.reset}`)
      console.log(JSON.stringify(fixedPosts, null, 2))
    }

    console.log(`\n${colors.green}✅ Migration completed successfully!${colors.reset}`)

  } catch (error) {
    console.error(`${colors.red}Error during migration:${colors.reset}`, error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error) 