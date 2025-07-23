const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')
const https = require('https')
const http = require('http')

const prisma = new PrismaClient()

// Функция для скачивания изображения с обработкой редиректов
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath)
    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, (response) => {
      // Обработка редиректа
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        console.log(`    📍 Редирект на: ${redirectUrl}`)
        file.close()
        require('fs').unlinkSync(filepath)
        return downloadImage(redirectUrl, filepath).then(resolve).catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        require('fs').unlinkSync(filepath)
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      require('fs').unlink(filepath, () => {})
      reject(err)
    })
  })
}

// Функция для получения случайного изображения из Picsum
async function getRandomImageUrl() {
  // Picsum предоставляет красивые случайные изображения
  // seed обеспечивает уникальность для каждого вызова
  const seed = Date.now() + Math.random()
  return `https://picsum.photos/seed/${seed}/1920/400`
}

// Функция для получения первого слова из никнейма
function getFirstWord(nickname) {
  if (!nickname) return 'abstract'
  
  // Разбиваем по различным разделителям
  const words = nickname.split(/[-_\s]+/)
  const firstWord = words[0] || 'abstract'
  
  // Если слово слишком короткое или состоит только из цифр, используем дефолтное
  if (firstWord.length < 3 || /^\d+$/.test(firstWord)) {
    return 'abstract'
  }
  
  return firstWord.toLowerCase()
}

// Тематические seed'ы для разных типов никнеймов
const seedMap = {
  'admin': 'technology',
  'user': 'nature',
  'test': 'space',
  'demo': 'ocean',
  'dev': 'code',
  'mod': 'city',
  'vip': 'luxury',
  'pro': 'business',
  'new': 'sunrise',
  'old': 'vintage',
  'bot': 'robot',
  'ai': 'neural',
  'crypto': 'bitcoin',
  'nft': 'art',
  'web': 'internet',
  'app': 'mobile',
  'game': 'gaming',
  'art': 'painting',
  'music': 'musical',
  'video': 'cinema',
  'photo': 'camera',
  'food': 'cuisine',
  'travel': 'wanderlust',
  'sport': 'fitness',
  'car': 'automotive',
  'dog': 'puppy',
  'cat': 'kitten',
  'love': 'heart',
  'cool': 'ice',
  'hot': 'fire',
  'cold': 'winter',
  'dark': 'night',
  'light': 'day',
  'happy': 'smile',
  'sad': 'rain'
}

async function restoreBackgrounds() {
  try {
    console.log('🔍 Поиск пользователей без фоновых изображений...')
    
    // Получаем всех пользователей без фона
    const usersWithoutBackground = await prisma.user.findMany({
      where: {
        OR: [
          { backgroundImage: null },
          { backgroundImage: '' }
        ]
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        name: true,
        backgroundImage: true
      }
    })
    
    console.log(`📊 Найдено ${usersWithoutBackground.length} пользователей без фона`)
    
    if (usersWithoutBackground.length === 0) {
      console.log('✅ Все пользователи уже имеют фоновые изображения')
      return
    }
    
    // Создаем директорию для фонов если её нет
    const backgroundsDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/fonana/public/backgrounds'
      : path.join(process.cwd(), 'public', 'backgrounds')
    
    try {
      await fs.access(backgroundsDir)
    } catch {
      await fs.mkdir(backgroundsDir, { recursive: true })
      console.log('📁 Создана директория для фонов')
    }
    
    // Обрабатываем каждого пользователя
    let successCount = 0
    let errorCount = 0
    
    for (const user of usersWithoutBackground) {
      try {
        const displayName = user.nickname || user.name || user.email
        console.log(`\n👤 Обработка пользователя: ${displayName}`)
        
        // Получаем первое слово из никнейма или имени
        const firstWord = getFirstWord(user.nickname || user.name || user.email)
        const seed = seedMap[firstWord] || firstWord
        console.log(`  🎨 Seed для изображения: ${seed}`)
        
        // Генерируем имя файла
        const filename = `bg_${user.id}_${Date.now()}.jpg`
        const filepath = path.join(backgroundsDir, filename)
        
        // Получаем URL изображения из Picsum с конкретным seed
        const imageUrl = `https://picsum.photos/seed/${seed}_${user.id}/1920/400`
        console.log(`  🔗 URL изображения: ${imageUrl}`)
        
        // Скачиваем изображение
        console.log(`  ⬇️  Скачивание изображения...`)
        await downloadImage(imageUrl, filepath)
        
        // Проверяем размер файла
        const stats = await fs.stat(filepath)
        if (stats.size < 1000) {
          throw new Error('Файл слишком маленький, возможно это не изображение')
        }
        console.log(`  📦 Размер файла: ${(stats.size / 1024).toFixed(1)} KB`)
        
        // Обновляем пользователя в базе данных
        const backgroundUrl = `/backgrounds/${filename}`
        await prisma.user.update({
          where: { id: user.id },
          data: { backgroundImage: backgroundUrl }
        })
        
        console.log(`  ✅ Фон успешно установлен: ${backgroundUrl}`)
        successCount++
        
        // Небольшая задержка чтобы не перегружать API
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        errorCount++
        console.error(`  ❌ Ошибка для пользователя ${user.nickname || user.name}:`, error.message)
      }
    }
    
    console.log('\n📊 Итоговая статистика:')
    console.log(`   ✅ Успешно обработано: ${successCount}`)
    console.log(`   ❌ Ошибок: ${errorCount}`)
    console.log('\n✨ Восстановление фонов завершено!')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем скрипт
restoreBackgrounds() 