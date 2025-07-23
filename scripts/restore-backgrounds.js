const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')
const https = require('https')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Функция для скачивания изображения
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      require('fs').unlink(filepath, () => {})
      reject(err)
    })
  })
}

// Функция для получения случайного изображения по ключевому слову из Unsplash
async function getRandomImageByKeyword(keyword) {
  const unsplashUrl = `https://source.unsplash.com/1920x400/?${encodeURIComponent(keyword)}`
  return unsplashUrl
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

// Тематические слова для разных никнеймов
const themeMap = {
  'admin': 'technology',
  'user': 'nature',
  'test': 'space',
  'demo': 'ocean',
  'dev': 'programming',
  'mod': 'city',
  'vip': 'luxury',
  'pro': 'business',
  'new': 'sunrise',
  'old': 'vintage',
  'bot': 'robot',
  'ai': 'artificial intelligence',
  'crypto': 'cryptocurrency',
  'nft': 'digital art',
  'web': 'internet',
  'app': 'mobile',
  'game': 'gaming',
  'art': 'painting',
  'music': 'musical',
  'video': 'cinema',
  'photo': 'photography',
  'food': 'cuisine',
  'travel': 'wanderlust',
  'sport': 'fitness',
  'car': 'automotive',
  'dog': 'puppy',
  'cat': 'kitten',
  'love': 'romance',
  'cool': 'neon',
  'hot': 'fire',
  'cold': 'winter',
  'dark': 'night',
  'light': 'daylight',
  'big': 'mountains',
  'small': 'minimal',
  'fast': 'speed',
  'slow': 'zen',
  'happy': 'joy',
  'sad': 'rain',
  'angry': 'storm',
  'calm': 'meditation',
  'wild': 'jungle',
  'free': 'freedom',
  'rich': 'wealth',
  'poor': 'simple',
  'young': 'youth',
  'baby': 'cute',
  'king': 'crown',
  'queen': 'royal',
  'prince': 'castle',
  'princess': 'fairy',
  'hero': 'superhero',
  'villain': 'dark',
  'good': 'angel',
  'bad': 'rebel',
  'best': 'champion',
  'worst': 'broken',
  'first': 'winner',
  'last': 'finish',
  'alpha': 'leader',
  'beta': 'second',
  'omega': 'final',
  'super': 'powerful',
  'mega': 'huge',
  'ultra': 'extreme',
  'max': 'maximum',
  'min': 'minimum',
  'plus': 'positive',
  'minus': 'negative',
  'zero': 'void',
  'one': 'unique',
  'two': 'couple',
  'three': 'triangle',
  'red': 'roses',
  'blue': 'ocean',
  'green': 'nature',
  'yellow': 'sunflower',
  'black': 'elegant',
  'white': 'pure',
  'gold': 'golden',
  'silver': 'metallic',
  'pink': 'cherry blossom',
  'purple': 'lavender',
  'orange': 'sunset'
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
    
    // Создаем директорию для фонов если её нет
    const backgroundsDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/Fonana/public/backgrounds'
      : path.join(process.cwd(), 'public', 'backgrounds')
    
    try {
      await fs.access(backgroundsDir)
    } catch {
      await fs.mkdir(backgroundsDir, { recursive: true })
      console.log('📁 Создана директория для фонов')
    }
    
    // Обрабатываем каждого пользователя
    for (const user of usersWithoutBackground) {
      try {
        const displayName = user.nickname || user.name || user.email
        console.log(`\n👤 Обработка пользователя: ${displayName}`)
        
        // Получаем первое слово из никнейма или имени
        const firstWord = getFirstWord(user.nickname || user.name || user.email)
        console.log(`  📝 Первое слово: ${firstWord}`)
        
        // Получаем тему для поиска
        const searchTheme = themeMap[firstWord] || firstWord
        console.log(`  🎨 Тема поиска: ${searchTheme}`)
        
        // Генерируем имя файла
        const filename = `bg_${user.id}_${Date.now()}.jpg`
        const filepath = path.join(backgroundsDir, filename)
        
        // Получаем URL изображения из Unsplash
        const imageUrl = await getRandomImageByKeyword(searchTheme)
        console.log(`  🔗 URL изображения: ${imageUrl}`)
        
        // Скачиваем изображение
        console.log(`  ⬇️  Скачивание изображения...`)
        await downloadImage(imageUrl, filepath)
        
        // Обновляем пользователя в базе данных
        const backgroundUrl = `/backgrounds/${filename}`
        await prisma.user.update({
          where: { id: user.id },
          data: { backgroundImage: backgroundUrl }
        })
        
        console.log(`  ✅ Фон успешно установлен: ${backgroundUrl}`)
        
        // Небольшая задержка чтобы не перегружать Unsplash API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`  ❌ Ошибка для пользователя ${user.nickname || user.name}:`, error.message)
      }
    }
    
    console.log('\n✨ Восстановление фонов завершено!')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем скрипт
restoreBackgrounds() 