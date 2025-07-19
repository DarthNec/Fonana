#!/usr/bin/env node

// [webp_mass_conversion_2025_017] Анализ изображений перед конвертацией
const fs = require('fs').promises
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ANSI цвета
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

// Анализ файловой системы
async function analyzeFileSystem() {
  log('📁 АНАЛИЗ ФАЙЛОВОЙ СИСТЕМЫ', 'magenta')
  log('=' + '='.repeat(40), 'magenta')
  
  const analysis = {
    directories: {},
    fileTypes: {},
    totalSize: 0,
    fileCount: 0
  }
  
  async function scanDirectory(dir, depth = 0) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      const indent = '  '.repeat(depth)
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          if (depth < 3) { // ограничиваем глубину
            log(`${indent}📁 ${entry.name}/`, 'blue')
            await scanDirectory(fullPath, depth + 1)
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          const stats = await fs.stat(fullPath)
          
          // Считаем только изображения
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            analysis.fileTypes[ext] = (analysis.fileTypes[ext] || { count: 0, size: 0 })
            analysis.fileTypes[ext].count++
            analysis.fileTypes[ext].size += stats.size
            analysis.totalSize += stats.size
            analysis.fileCount++
            
            // Группируем по директориям
            const relativePath = path.relative('public', dir)
            if (!analysis.directories[relativePath]) {
              analysis.directories[relativePath] = { count: 0, size: 0, files: [] }
            }
            analysis.directories[relativePath].count++
            analysis.directories[relativePath].size += stats.size
            analysis.directories[relativePath].files.push({
              name: entry.name,
              size: stats.size,
              ext
            })
            
            if (depth <= 2) {
              const sizeKB = (stats.size / 1024).toFixed(1)
              log(`${indent}  📄 ${entry.name} (${sizeKB} KB)`, 'yellow')
            }
          }
        }
      }
    } catch (error) {
      log(`❌ Ошибка при сканировании ${dir}: ${error.message}`, 'red')
    }
  }
  
  await scanDirectory('public')
  
  // Выводим статистику
  log('\n📊 СТАТИСТИКА ПО ТИПАМ ФАЙЛОВ:', 'cyan')
  for (const [ext, data] of Object.entries(analysis.fileTypes)) {
    const sizeMB = (data.size / 1024 / 1024).toFixed(2)
    log(`   ${ext}: ${data.count} файлов, ${sizeMB} MB`, 'yellow')
  }
  
  log('\n📁 СТАТИСТИКА ПО ДИРЕКТОРИЯМ:', 'cyan')
  for (const [dir, data] of Object.entries(analysis.directories)) {
    const sizeMB = (data.size / 1024 / 1024).toFixed(2)
    const displayDir = dir || 'public (root)'
    log(`   ${displayDir}: ${data.count} файлов, ${sizeMB} MB`, 'yellow')
  }
  
  const totalSizeMB = (analysis.totalSize / 1024 / 1024).toFixed(2)
  log(`\n💾 ОБЩИЙ РАЗМЕР: ${totalSizeMB} MB (${analysis.fileCount} файлов)`, 'green')
  
  return analysis
}

// Анализ базы данных
async function analyzeDatabaseReferences() {
  log('\n💾 АНАЛИЗ ССЫЛОК В БАЗЕ ДАННЫХ', 'magenta')
  log('=' + '='.repeat(40), 'magenta')
  
  try {
    // Анализ аватаров
    const avatarStats = await prisma.user.findMany({
      where: { avatar: { not: null } },
      select: { avatar: true }
    })
    
    const avatarExtensions = {}
    avatarStats.forEach(user => {
      if (user.avatar) {
        const ext = path.extname(user.avatar).toLowerCase()
        avatarExtensions[ext] = (avatarExtensions[ext] || 0) + 1
      }
    })
    
    log('👤 АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ:', 'cyan')
    log(`   Всего: ${avatarStats.length} записей`, 'yellow')
    for (const [ext, count] of Object.entries(avatarExtensions)) {
      log(`   ${ext}: ${count} файлов`, 'yellow')
    }
    
    // Анализ фонов
    const backgroundStats = await prisma.user.findMany({
      where: { backgroundImage: { not: null } },
      select: { backgroundImage: true }
    })
    
    const backgroundExtensions = {}
    backgroundStats.forEach(user => {
      if (user.backgroundImage) {
        const ext = path.extname(user.backgroundImage).toLowerCase()
        backgroundExtensions[ext] = (backgroundExtensions[ext] || 0) + 1
      }
    })
    
    log('\n🖼️  ФОНОВЫЕ ИЗОБРАЖЕНИЯ:', 'cyan')
    log(`   Всего: ${backgroundStats.length} записей`, 'yellow')
    for (const [ext, count] of Object.entries(backgroundExtensions)) {
      log(`   ${ext}: ${count} файлов`, 'yellow')
    }
    
    // Анализ медиа постов
    const mediaStats = await prisma.post.findMany({
      where: { mediaUrl: { not: null } },
      select: { mediaUrl: true, type: true }
    })
    
    const mediaExtensions = {}
    const mediaTypes = {}
    mediaStats.forEach(post => {
      if (post.mediaUrl) {
        const ext = path.extname(post.mediaUrl).toLowerCase()
        mediaExtensions[ext] = (mediaExtensions[ext] || 0) + 1
        mediaTypes[post.type] = (mediaTypes[post.type] || 0) + 1
      }
    })
    
    log('\n📸 МЕДИА ФАЙЛЫ ПОСТОВ:', 'cyan')
    log(`   Всего: ${mediaStats.length} записей`, 'yellow')
    log('   По расширениям:', 'blue')
    for (const [ext, count] of Object.entries(mediaExtensions)) {
      log(`     ${ext}: ${count} файлов`, 'yellow')
    }
    log('   По типам:', 'blue')
    for (const [type, count] of Object.entries(mediaTypes)) {
      log(`     ${type}: ${count} постов`, 'yellow')
    }
    
    // Анализ thumbnail
    const thumbnailStats = await prisma.post.findMany({
      where: { thumbnail: { not: null } },
      select: { thumbnail: true }
    })
    
    const thumbnailExtensions = {}
    thumbnailStats.forEach(post => {
      if (post.thumbnail) {
        const ext = path.extname(post.thumbnail).toLowerCase()
        thumbnailExtensions[ext] = (thumbnailExtensions[ext] || 0) + 1
      }
    })
    
    log('\n🖼️  THUMBNAIL ПОСТОВ:', 'cyan')
    log(`   Всего: ${thumbnailStats.length} записей`, 'yellow')
    for (const [ext, count] of Object.entries(thumbnailExtensions)) {
      log(`   ${ext}: ${count} файлов`, 'yellow')
    }
    
    return {
      avatars: { total: avatarStats.length, extensions: avatarExtensions },
      backgrounds: { total: backgroundStats.length, extensions: backgroundExtensions },
      media: { total: mediaStats.length, extensions: mediaExtensions, types: mediaTypes },
      thumbnails: { total: thumbnailStats.length, extensions: thumbnailExtensions }
    }
    
  } catch (error) {
    log(`❌ Ошибка анализа БД: ${error.message}`, 'red')
    return null
  }
}

// Проверка существования файлов
async function validateFileExistence(dbStats) {
  log('\n🔍 ПРОВЕРКА СУЩЕСТВОВАНИЯ ФАЙЛОВ', 'magenta')
  log('=' + '='.repeat(40), 'magenta')
  
  const checks = {
    existing: 0,
    missing: 0,
    missingFiles: []
  }
  
  // Собираем все пути из БД
  const allPaths = []
  
  try {
    const avatars = await prisma.user.findMany({
      where: { avatar: { not: null } },
      select: { avatar: true }
    })
    allPaths.push(...avatars.map(u => u.avatar).filter(Boolean))
    
    const backgrounds = await prisma.user.findMany({
      where: { backgroundImage: { not: null } },
      select: { backgroundImage: true }
    })
    allPaths.push(...backgrounds.map(u => u.backgroundImage).filter(Boolean))
    
    const media = await prisma.post.findMany({
      where: { 
        OR: [
          { mediaUrl: { not: null } },
          { thumbnail: { not: null } }
        ]
      },
      select: { mediaUrl: true, thumbnail: true }
    })
    allPaths.push(...media.map(p => p.mediaUrl).filter(Boolean))
    allPaths.push(...media.map(p => p.thumbnail).filter(Boolean))
    
    // Проверяем существование каждого файла
    for (const filePath of allPaths) {
      try {
        const fullPath = path.join('public', filePath.replace('/', ''))
        await fs.access(fullPath)
        checks.existing++
      } catch (error) {
        checks.missing++
        checks.missingFiles.push(filePath)
      }
    }
    
    log(`✅ Существующих файлов: ${checks.existing}`, 'green')
    log(`❌ Отсутствующих файлов: ${checks.missing}`, 'red')
    
    if (checks.missing > 0) {
      log('\n⚠️  ОТСУТСТВУЮЩИЕ ФАЙЛЫ:', 'yellow')
      checks.missingFiles.slice(0, 10).forEach(file => {
        log(`   ${file}`, 'red')
      })
      if (checks.missingFiles.length > 10) {
        log(`   ... и еще ${checks.missingFiles.length - 10} файлов`, 'red')
      }
    }
    
  } catch (error) {
    log(`❌ Ошибка проверки файлов: ${error.message}`, 'red')
  }
  
  return checks
}

// Оценка экономии от конвертации
function estimateSavings(fileSystemAnalysis) {
  log('\n📈 ОЦЕНКА ЭКОНОМИИ ОТ WEBP КОНВЕРТАЦИИ', 'magenta')
  log('=' + '='.repeat(40), 'magenta')
  
  const estimates = {}
  let totalSavings = 0
  
  for (const [ext, data] of Object.entries(fileSystemAnalysis.fileTypes)) {
    if (ext !== '.webp') {
      // Оценочная экономия для разных форматов
      let compressionRatio = 0.75 // 75% экономии по умолчанию
      
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          compressionRatio = 0.60 // 60% экономии для JPEG
          break
        case '.png':
          compressionRatio = 0.80 // 80% экономии для PNG
          break
        case '.gif':
          compressionRatio = 0.70 // 70% экономии для GIF
          break
      }
      
      const estimatedSavings = data.size * compressionRatio
      totalSavings += estimatedSavings
      
      estimates[ext] = {
        currentSize: data.size,
        estimatedSavings,
        compressionRatio: compressionRatio * 100
      }
      
      const currentMB = (data.size / 1024 / 1024).toFixed(2)
      const savedMB = (estimatedSavings / 1024 / 1024).toFixed(2)
      
      log(`${ext}: ${currentMB} MB → экономия ~${savedMB} MB (${(compressionRatio * 100).toFixed(0)}%)`, 'yellow')
    }
  }
  
  const totalCurrentMB = (fileSystemAnalysis.totalSize / 1024 / 1024).toFixed(2)
  const totalSavedMB = (totalSavings / 1024 / 1024).toFixed(2)
  const overallCompression = (totalSavings / fileSystemAnalysis.totalSize * 100).toFixed(1)
  
  log(`\n💾 ОБЩАЯ ЭКОНОМИЯ: ${totalSavedMB} MB из ${totalCurrentMB} MB (${overallCompression}%)`, 'green')
  
  return estimates
}

// Главная функция
async function main() {
  log('🔍 АНАЛИЗ ИЗОБРАЖЕНИЙ ПЕРЕД WEBP КОНВЕРТАЦИЕЙ', 'magenta')
  log('=' + '='.repeat(60), 'magenta')
  
  try {
    // 1. Анализ файловой системы
    const fileSystemAnalysis = await analyzeFileSystem()
    
    // 2. Анализ ссылок в БД
    const dbAnalysis = await analyzeDatabaseReferences()
    
    // 3. Проверка существования файлов
    if (dbAnalysis) {
      await validateFileExistence(dbAnalysis)
    }
    
    // 4. Оценка экономии
    estimateSavings(fileSystemAnalysis)
    
    log('\n✅ АНАЛИЗ ЗАВЕРШЕН', 'green')
    log('🚀 Теперь можно запустить: node scripts/webp-mass-conversion.js', 'cyan')
    
  } catch (error) {
    log(`💥 ОШИБКА: ${error.message}`, 'red')
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { analyzeFileSystem, analyzeDatabaseReferences, validateFileExistence } 