#!/usr/bin/env node

// [webp_mass_conversion_2025_017] Массовая конвертация изображений в WebP
const fs = require('fs').promises
const path = require('path')
const sharp = require('sharp')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Конфигурация
const CONFIG = {
  sourceDir: 'public',
  backupDir: 'backup-images-before-webp',
  mapFile: 'webp-conversion-map.json',
  qualitySettings: {
    avatars: 85,
    backgrounds: 80,
    posts: 85,
    thumbnails: 80,
    placeholders: 75
  },
  excludePatterns: [
    /favicon/i,
    /\.ico$/,
    /\.svg$/,
    /\.webp$/  // Уже в WebP
  ]
}

// ANSI цвета для красивого вывода
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Функция сканирования всех изображений
async function scanImages(dir) {
  const images = []
  
  async function scanRecursive(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        await scanRecursive(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        
        // Проверяем что это изображение и не исключение
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
          const shouldExclude = CONFIG.excludePatterns.some(pattern => 
            pattern.test(entry.name) || pattern.test(fullPath)
          )
          
          if (!shouldExclude) {
            const stats = await fs.stat(fullPath)
            images.push({
              originalPath: fullPath,
              name: entry.name,
              extension: ext,
              size: stats.size,
              category: getImageCategory(fullPath)
            })
          }
        }
      }
    }
  }
  
  await scanRecursive(dir)
  return images
}

// Определение категории изображения для настройки качества
function getImageCategory(filePath) {
  if (filePath.includes('/avatars/')) return 'avatars'
  if (filePath.includes('/backgrounds/')) return 'backgrounds'
  if (filePath.includes('/posts/')) return 'posts'
  if (filePath.includes('thumb_')) return 'thumbnails'
  if (filePath.includes('placeholder')) return 'placeholders'
  return 'posts' // default
}

// Создание backup
async function createBackup(images) {
  log('\n📦 Создание backup...', 'yellow')
  
  try {
    await fs.mkdir(CONFIG.backupDir, { recursive: true })
    
    for (const image of images) {
      const relativePath = path.relative(CONFIG.sourceDir, image.originalPath)
      const backupPath = path.join(CONFIG.backupDir, relativePath)
      const backupDir = path.dirname(backupPath)
      
      await fs.mkdir(backupDir, { recursive: true })
      await fs.copyFile(image.originalPath, backupPath)
    }
    
    log(`✅ Backup создан в директории: ${CONFIG.backupDir}`, 'green')
  } catch (error) {
    log(`❌ Ошибка создания backup: ${error.message}`, 'red')
    throw error
  }
}

// Конвертация изображения в WebP
async function convertToWebP(image) {
  const quality = CONFIG.qualitySettings[image.category]
  const originalPath = image.originalPath
  const webpPath = originalPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp')
  
  try {
    const startTime = Date.now()
    
    await sharp(originalPath)
      .webp({ quality })
      .toFile(webpPath)
    
    const originalStats = await fs.stat(originalPath)
    const webpStats = await fs.stat(webpPath)
    const compressionRatio = ((originalStats.size - webpStats.size) / originalStats.size * 100).toFixed(1)
    const duration = Date.now() - startTime
    
    return {
      originalPath,
      webpPath,
      originalSize: originalStats.size,
      webpSize: webpStats.size,
      compressionRatio: parseFloat(compressionRatio),
      duration,
      success: true
    }
  } catch (error) {
    return {
      originalPath,
      webpPath,
      error: error.message,
      success: false
    }
  }
}

// Массовая конвертация
async function massConvert(images) {
  log('\n🔄 Начинаем массовую конвертацию...', 'cyan')
  
  const results = []
  const total = images.length
  let completed = 0
  let totalOriginalSize = 0
  let totalWebpSize = 0
  
  for (const image of images) {
    const result = await convertToWebP(image)
    results.push(result)
    completed++
    
    if (result.success) {
      totalOriginalSize += result.originalSize
      totalWebpSize += result.webpSize
      
      log(
        `✅ [${completed}/${total}] ${path.basename(result.originalPath)} → ${result.compressionRatio}% экономии (${result.duration}ms)`,
        'green'
      )
    } else {
      log(
        `❌ [${completed}/${total}] ${path.basename(result.originalPath)} - ОШИБКА: ${result.error}`,
        'red'
      )
    }
    
    // Прогресс каждые 50 файлов
    if (completed % 50 === 0) {
      const progress = (completed / total * 100).toFixed(1)
      log(`📊 Прогресс: ${progress}% (${completed}/${total})`, 'blue')
    }
  }
  
  const overallCompression = ((totalOriginalSize - totalWebpSize) / totalOriginalSize * 100).toFixed(1)
  
  log('\n📈 РЕЗУЛЬТАТЫ КОНВЕРТАЦИИ:', 'magenta')
  log(`   Всего файлов: ${total}`, 'cyan')
  log(`   Успешно: ${results.filter(r => r.success).length}`, 'green')
  log(`   Ошибок: ${results.filter(r => !r.success).length}`, 'red')
  log(`   Исходный размер: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`, 'yellow')
  log(`   WebP размер: ${(totalWebpSize / 1024 / 1024).toFixed(2)} MB`, 'yellow')
  log(`   Общая экономия: ${overallCompression}%`, 'green')
  
  return results
}

// Создание карты изменений для обновления БД
function createConversionMap(results) {
  const map = {
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    successfulConversions: results.filter(r => r.success).length,
    conversions: {}
  }
  
  for (const result of results) {
    if (result.success) {
      // Создаем маппинг для обновления путей в БД
      const originalRelative = result.originalPath.replace('public/', '/')
      const webpRelative = result.webpPath.replace('public/', '/')
      
      map.conversions[originalRelative] = {
        webpPath: webpRelative,
        originalSize: result.originalSize,
        webpSize: result.webpSize,
        compressionRatio: result.compressionRatio
      }
    }
  }
  
  return map
}

// Обновление путей в базе данных
async function updateDatabase(conversionMap) {
  log('\n💾 Обновление базы данных...', 'yellow')
  
  const updates = {
    users: { avatar: 0, backgroundImage: 0 },
    posts: { mediaUrl: 0, thumbnail: 0 }
  }
  
  try {
    // Обновляем аватары пользователей
    for (const [originalPath, conversion] of Object.entries(conversionMap.conversions)) {
      await prisma.user.updateMany({
        where: { avatar: originalPath },
        data: { avatar: conversion.webpPath }
      })
      
      const avatarUpdates = await prisma.user.count({
        where: { avatar: conversion.webpPath }
      })
      updates.users.avatar += avatarUpdates
    }
    
    // Обновляем фоны пользователей
    for (const [originalPath, conversion] of Object.entries(conversionMap.conversions)) {
      await prisma.user.updateMany({
        where: { backgroundImage: originalPath },
        data: { backgroundImage: conversion.webpPath }
      })
      
      const bgUpdates = await prisma.user.count({
        where: { backgroundImage: conversion.webpPath }
      })
      updates.users.backgroundImage += bgUpdates
    }
    
    // Обновляем медиа файлы постов
    for (const [originalPath, conversion] of Object.entries(conversionMap.conversions)) {
      await prisma.post.updateMany({
        where: { mediaUrl: originalPath },
        data: { mediaUrl: conversion.webpPath }
      })
      
      const mediaUpdates = await prisma.post.count({
        where: { mediaUrl: conversion.webpPath }
      })
      updates.posts.mediaUrl += mediaUpdates
    }
    
    // Обновляем thumbnail постов
    for (const [originalPath, conversion] of Object.entries(conversionMap.conversions)) {
      await prisma.post.updateMany({
        where: { thumbnail: originalPath },
        data: { thumbnail: conversion.webpPath }
      })
      
      const thumbUpdates = await prisma.post.count({
        where: { thumbnail: conversion.webpPath }
      })
      updates.posts.thumbnail += thumbUpdates
    }
    
    log('✅ База данных обновлена:', 'green')
    log(`   Аватары: ${updates.users.avatar} обновлений`, 'cyan')
    log(`   Фоны: ${updates.users.backgroundImage} обновлений`, 'cyan')
    log(`   Медиа постов: ${updates.posts.mediaUrl} обновлений`, 'cyan')
    log(`   Thumbnail: ${updates.posts.thumbnail} обновлений`, 'cyan')
    
    return updates
  } catch (error) {
    log(`❌ Ошибка обновления БД: ${error.message}`, 'red')
    throw error
  }
}

// Удаление оригинальных файлов (ТОЛЬКО после подтверждения)
async function cleanupOriginalFiles(conversionMap) {
  log('\n🗑️  Очистка оригинальных файлов...', 'yellow')
  
  let deleted = 0
  
  for (const [originalPath] of Object.entries(conversionMap.conversions)) {
    try {
      const fullPath = path.join('public', originalPath.substring(1)) // убираем первый '/'
      await fs.unlink(fullPath)
      deleted++
    } catch (error) {
      log(`⚠️  Не удалось удалить ${originalPath}: ${error.message}`, 'yellow')
    }
  }
  
  log(`✅ Удалено ${deleted} оригинальных файлов`, 'green')
  return deleted
}

// Главная функция
async function main() {
  log('🚀 МАССОВАЯ КОНВЕРТАЦИЯ В WEBP НАЧАЛАСЬ', 'magenta')
  log('=' + '='.repeat(50), 'magenta')
  
  try {
    // 1. Сканирование файлов
    log('\n🔍 Сканирование изображений...', 'cyan')
    const images = await scanImages(CONFIG.sourceDir)
    
    log(`📋 Найдено ${images.length} изображений для конвертации:`, 'blue')
    const categoryCounts = images.reduce((acc, img) => {
      acc[img.category] = (acc[img.category] || 0) + 1
      return acc
    }, {})
    
    for (const [category, count] of Object.entries(categoryCounts)) {
      log(`   ${category}: ${count} файлов`, 'yellow')
    }
    
    if (images.length === 0) {
      log('✅ Нет файлов для конвертации!', 'green')
      return
    }
    
    // 2. Создание backup
    await createBackup(images)
    
    // 3. Массовая конвертация
    const results = await massConvert(images)
    
    // 4. Создание карты изменений
    const conversionMap = createConversionMap(results)
    await fs.writeFile(CONFIG.mapFile, JSON.stringify(conversionMap, null, 2))
    log(`💾 Карта изменений сохранена: ${CONFIG.mapFile}`, 'green')
    
    // 5. Обновление базы данных
    await updateDatabase(conversionMap)
    
    // 6. Опциональная очистка (требует подтверждения)
    log('\n⚠️  ВНИМАНИЕ: Удалить оригинальные файлы? (y/N):', 'yellow')
    // Для автоматического режима можно раскомментировать:
    // await cleanupOriginalFiles(conversionMap)
    
    log('\n🎉 КОНВЕРТАЦИЯ ЗАВЕРШЕНА УСПЕШНО!', 'green')
    log('=' + '='.repeat(50), 'green')
    
  } catch (error) {
    log(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red')
    log('🔄 Используйте backup для восстановления файлов', 'yellow')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, scanImages, convertToWebP, createConversionMap } 