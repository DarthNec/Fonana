const fs = require('fs')
const path = require('path')

function checkVideoDirectory() {
  console.log('=== Проверка директории с видео ===\n')
  
  const isDevelopment = process.env.NODE_ENV !== 'production'
  console.log(`Окружение: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}\n`)
  
  // Пути для разных окружений
  const paths = {
    development: {
      videos: path.join(process.cwd(), 'public', 'posts', 'videos'),
      images: path.join(process.cwd(), 'public', 'posts', 'images'),
      posts: path.join(process.cwd(), 'public', 'posts')
    },
    production: {
      videos: '/var/www/fonana/public/posts/videos',
      images: '/var/www/fonana/public/posts/images',
      posts: '/var/www/fonana/public/posts'
    }
  }
  
  const currentPaths = isDevelopment ? paths.development : paths.production
  
  // Проверяем директорию posts
  console.log('1. Директория posts:')
  console.log(`   Путь: ${currentPaths.posts}`)
  if (fs.existsSync(currentPaths.posts)) {
    console.log('   ✅ Существует')
    const stats = fs.statSync(currentPaths.posts)
    console.log(`   Права доступа: ${stats.mode.toString(8)}`)
    
    // Список поддиректорий
    try {
      const subdirs = fs.readdirSync(currentPaths.posts).filter(item => {
        const itemPath = path.join(currentPaths.posts, item)
        return fs.statSync(itemPath).isDirectory()
      })
      console.log(`   Поддиректории: ${subdirs.join(', ') || 'нет'}`)
    } catch (err) {
      console.log(`   ❌ Ошибка чтения: ${err.message}`)
    }
  } else {
    console.log('   ❌ НЕ существует')
  }
  
  // Проверяем директорию videos
  console.log('\n2. Директория videos:')
  console.log(`   Путь: ${currentPaths.videos}`)
  if (fs.existsSync(currentPaths.videos)) {
    console.log('   ✅ Существует')
    const stats = fs.statSync(currentPaths.videos)
    console.log(`   Права доступа: ${stats.mode.toString(8)}`)
    
    // Список файлов
    try {
      const files = fs.readdirSync(currentPaths.videos)
      console.log(`   Количество файлов: ${files.length}`)
      
      if (files.length > 0) {
        console.log('\n   Файлы:')
        files.slice(0, 10).forEach(file => {
          const filePath = path.join(currentPaths.videos, file)
          const fileStats = fs.statSync(filePath)
          const sizeMB = (fileStats.size / (1024 * 1024)).toFixed(2)
          console.log(`   - ${file} (${sizeMB} MB)`)
        })
        if (files.length > 10) {
          console.log(`   ... и еще ${files.length - 10} файлов`)
        }
      }
    } catch (err) {
      console.log(`   ❌ Ошибка чтения: ${err.message}`)
    }
  } else {
    console.log('   ❌ НЕ существует')
    
    // Пытаемся создать
    console.log('\n   Попытка создать директорию...')
    try {
      fs.mkdirSync(currentPaths.videos, { recursive: true })
      console.log('   ✅ Директория создана успешно')
    } catch (err) {
      console.log(`   ❌ Ошибка создания: ${err.message}`)
    }
  }
  
  // Проверяем директорию images для сравнения
  console.log('\n3. Директория images (для сравнения):')
  console.log(`   Путь: ${currentPaths.images}`)
  if (fs.existsSync(currentPaths.images)) {
    console.log('   ✅ Существует')
    try {
      const files = fs.readdirSync(currentPaths.images)
      console.log(`   Количество файлов: ${files.length}`)
    } catch (err) {
      console.log(`   ❌ Ошибка чтения: ${err.message}`)
    }
  } else {
    console.log('   ❌ НЕ существует')
  }
  
  // Проверяем nginx конфигурацию (если на продакшн)
  if (!isDevelopment) {
    console.log('\n4. Проверка nginx alias:')
    console.log('   Для корректной работы видео, nginx должен иметь alias для /posts/')
    console.log('   Пример конфигурации:')
    console.log('   location /posts/ {')
    console.log('       alias /var/www/fonana/public/posts/;')
    console.log('   }')
  }
}

checkVideoDirectory() 