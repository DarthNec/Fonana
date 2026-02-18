// Скрипт для загрузки женских портретов с Pexels
// Запуск: node scripts/download-female-avatars.js
// 
// ✅ ПРЕИМУЩЕСТВА PEXELS:
// - НЕ требует атрибуции фотографа (Pexels License)
// - 200 requests/hour (выше чем Unsplash demo)
// - Высокое качество изображений
// - Бесплатный API key
//
// 📝 ПОЛУЧЕНИЕ API KEY:
// 1. Зарегистрируйтесь на https://www.pexels.com/api/
// 2. Создайте приложение в Dashboard
// 3. Скопируйте API Key
// 4. Используйте один из способов:
//    - Переменная окружения: set PEXELS_API_KEY=your_key_here
//    - Аргумент командной строки: --api-key your_key_here
//    - Файл .env: PEXELS_API_KEY=your_key_here

const https = require('https');
const fs = require('fs');
const path = require('path');

// Настройки
const CONFIG = {
  apiKey: 'b4SmMkE0iQcOIQiVEh8kd2Uvopj889aIMmLO03IveyFcRPolhAKivAv7',  // API ключ из переменной окружения
  totalImages: 250,                          // Сколько изображений загрузить (увеличено до 250)
  outputDir: 'public/media/faces',           // Папка для сохранения
  imageSize: 'medium',                       // Размер: tiny, small, medium, large, large2x
  perPage: 80,                               // Изображений на страницу (max 80)
  pauseBetweenRequests: 2000,                // Пауза между запросами (мс)
  pauseBetweenPages: 5000,                   // Пауза между страницами (мс)
  retryDelay: 10000,                         // Задержка при ошибке (мс)
  maxRetries: 3,                             // Максимум попыток при ошибке
  startFromExisting: true,                   // Продолжить с последнего существующего файла
  
  // Поисковые запросы для разнообразия
  searchQueries: [
    'woman portrait',
    'female face',
    'woman headshot',
    'professional woman',
    'young woman',
    'woman smiling',
    'business woman',
    'elegant woman'
  ]
};

// Создание папки если не существует
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Создана папка: ${dirPath}`);
  }
}

// Поиск существующих файлов и определение стартового номера
function findExistingFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { count: 0, maxNumber: 0, files: [] };
  }
  
  const files = fs.readdirSync(dirPath);
  const portraitFiles = files.filter(f => f.startsWith('female-portrait-') && f.endsWith('.jpg'));
  
  let maxNumber = 0;
  portraitFiles.forEach(file => {
    const match = file.match(/female-portrait-(\d+)\.jpg/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });
  
  return {
    count: portraitFiles.length,
    maxNumber: maxNumber,
    files: portraitFiles
  };
}

// Проверка существования файла по содержимому (хеш)
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const crypto = require('crypto');
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Функция для загрузки изображения по URL
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(CONFIG.outputDir, filename);
    
    // Проверка существования файла
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Пропуск (уже существует): ${filename}`);
      resolve({ skipped: true });
      return;
    }
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      // Обработка редиректов
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        file.close();
        fs.unlinkSync(filePath);
        return downloadImage(redirectUrl, filename).then(resolve).catch(reject);
      }
      
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true, filename });
        });
      } else {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

// Запрос к Pexels API для получения списка фотографий
function fetchPhotosFromPexels(query, page = 1, perPage = 80) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=square`,
      method: 'GET',
      headers: {
        'Authorization': CONFIG.apiKey
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error('Ошибка парсинга JSON: ' + error.message));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('Rate limit exceeded (429)'));
        } else if (res.statusCode === 401) {
          reject(new Error('Неверный API key (401)'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Форматирование времени
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}м ${remainingSeconds}с`;
  }
  return `${seconds}с`;
}

// Основная функция загрузки
async function downloadAllImages() {
  console.log('🚀 Начинаю загрузку женских портретов с Pexels\n');
  
  // Проверка API ключа
  if (!CONFIG.apiKey) {
    console.error('❌ ОШИБКА: Не указан API ключ Pexels!\n');
    console.log('📝 Получите бесплатный API key:');
    console.log('   1. Зарегистрируйтесь: https://www.pexels.com/api/');
    console.log('   2. Создайте приложение в Dashboard');
    console.log('   3. Скопируйте API Key\n');
    console.log('💡 Способы указать API key:');
    console.log('   - Переменная окружения: set PEXELS_API_KEY=your_key_here');
    console.log('   - Аргумент командной строки: --api-key your_key_here');
    console.log('   - Файл .env: PEXELS_API_KEY=your_key_here\n');
    process.exit(1);
  }
  
  ensureDirectoryExists(CONFIG.outputDir);
  
  // Проверка существующих файлов
  const existingInfo = findExistingFiles(CONFIG.outputDir);
  const startNumber = CONFIG.startFromExisting ? existingInfo.maxNumber : 0;
  
  console.log(`📊 Параметры:`);
  console.log(`   - Изображений: ${CONFIG.totalImages} (цель)`);
  console.log(`   - Размер: ${CONFIG.imageSize}`);
  console.log(`   - Папка: ${CONFIG.outputDir}`);
  console.log(`   - API Key: ${CONFIG.apiKey.substring(0, 10)}...`);
  
  if (existingInfo.count > 0) {
    console.log(`\n📁 Существующие файлы:`);
    console.log(`   - Найдено: ${existingInfo.count} файлов`);
    console.log(`   - Максимальный номер: ${existingInfo.maxNumber}`);
    console.log(`   - Начну с номера: ${startNumber + 1}`);
    console.log(`   - Нужно загрузить: ${CONFIG.totalImages - existingInfo.count} новых`);
  }
  
  console.log(`   - Запросов к API: ~${Math.ceil((CONFIG.totalImages - existingInfo.count) / CONFIG.perPage)}\n`);
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let downloadedImages = 0;
  
  // Собираем фотографии из разных запросов
  const allPhotos = [];
  
  for (const query of CONFIG.searchQueries) {
    if (allPhotos.length >= CONFIG.totalImages) break;
    
    console.log(`🔍 Поиск: "${query}"...`);
    
    try {
      const photosPerQuery = Math.ceil(CONFIG.totalImages / CONFIG.searchQueries.length);
      const pagesNeeded = Math.ceil(photosPerQuery / CONFIG.perPage);
      
      for (let page = 1; page <= pagesNeeded; page++) {
        if (allPhotos.length >= CONFIG.totalImages) break;
        
        console.log(`   📄 Страница ${page}/${pagesNeeded} для запроса "${query}"...`);
        
        const result = await fetchPhotosFromPexels(query, page, CONFIG.perPage);
        
        if (result.photos && result.photos.length > 0) {
          allPhotos.push(...result.photos);
          console.log(`   ✅ Получено ${result.photos.length} фотографий (всего: ${allPhotos.length})`);
        } else {
          console.log(`   ⚠️  Фотографий не найдено`);
          break;
        }
        
        // Пауза между страницами
        if (page < pagesNeeded && allPhotos.length < CONFIG.totalImages) {
          console.log(`   ⏸️  Пауза ${CONFIG.pauseBetweenPages/1000}с...\n`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenPages));
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка при запросе "${query}": ${error.message}`);
      
      if (error.message.includes('Rate limit')) {
        console.log(`   ⏸️  Rate limit! Пауза 60 секунд...\n`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
    
    // Пауза между запросами
    if (allPhotos.length < CONFIG.totalImages) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenRequests));
    }
  }
  
  // Определяем сколько нужно загрузить (используем existingInfo из начала функции)
  const needToDownload = CONFIG.totalImages - existingInfo.count;
  
  // Ограничиваем количество фотографий
  const photosToDownload = allPhotos.slice(0, Math.max(needToDownload, CONFIG.totalImages));
  console.log(`\n📸 Найдено фотографий в API: ${photosToDownload.length}`);
  console.log(`📁 Уже существует: ${existingInfo.count} файлов`);
  console.log(`🎯 Нужно загрузить: ${needToDownload} новых`);
  console.log(`🔄 Начинаю загрузку с номера ${startNumber + 1}...\n`);
  
  // Загружаем фотографии
  let currentNumber = startNumber;
  for (let i = 0; i < photosToDownload.length && downloadedImages < needToDownload; i++) {
    const photo = photosToDownload[i];
    currentNumber++;
    const filename = `female-portrait-${String(currentNumber).padStart(3, '0')}.jpg`;
    
    // Выбираем размер изображения
    const imageUrl = photo.src[CONFIG.imageSize] || photo.src.medium;
    
    try {
      const totalProgress = existingInfo.count + downloadedImages + 1;
      const targetTotal = CONFIG.totalImages;
      
      console.log(`[${totalProgress}/${targetTotal}] Загружаю: ${filename}...`);
      console.log(`   📷 Фотограф: ${photo.photographer}`);
      console.log(`   🔗 URL: ${imageUrl.substring(0, 60)}...`);
      
      const result = await downloadImage(imageUrl, filename);
      
      if (result.skipped) {
        skippedCount++;
        console.log(`⏭️  [${totalProgress}/${targetTotal}] Пропущено: ${filename} (уже существует)\n`);
      } else {
        successCount++;
        downloadedImages++;
        console.log(`✅ [${totalProgress}/${targetTotal}] Загружено: ${filename}\n`);
      }
      
      // Прогресс каждые 10 изображений
      if (downloadedImages % 10 === 0) {
        const elapsed = Date.now() - startTime;
        const avgTime = elapsed / downloadedImages;
        const remaining = (needToDownload - downloadedImages) * avgTime;
        
        console.log(`📈 Прогресс: ${existingInfo.count + downloadedImages}/${targetTotal} (${Math.round((existingInfo.count + downloadedImages)/targetTotal*100)}%)`);
        console.log(`   ✅ Успешно загружено: ${successCount}`);
        console.log(`   ⏭️  Пропущено: ${skippedCount}`);
        console.log(`   ❌ Ошибок: ${errorCount}`);
        console.log(`   ⏱️  Прошло: ${formatTime(elapsed)} | Осталось: ~${formatTime(remaining)}\n`);
      }
      
      // Проверка достижения цели
      if (existingInfo.count + downloadedImages >= CONFIG.totalImages) {
        console.log(`\n🎯 Достигнута цель: ${CONFIG.totalImages} изображений!`);
        break;
      }
      
      // Пауза между загрузками
      await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenRequests));
      
    } catch (error) {
      errorCount++;
      console.log(`❌ [${existingInfo.count + downloadedImages + 1}/${CONFIG.totalImages}] Ошибка при загрузке ${filename}: ${error.message}\n`);
      
      // Пауза после ошибки
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
  }
  
  const totalTime = Date.now() - startTime;
  const finalExistingInfo = findExistingFiles(CONFIG.outputDir);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ЗАГРУЗКА ЗАВЕРШЕНА!\n');
  console.log(`📊 Финальная статистика:`);
  console.log(`   📁 Было файлов: ${existingInfo.count}`);
  console.log(`   ⬇️  Загружено новых: ${successCount}`);
  console.log(`   📋 Всего файлов сейчас: ${finalExistingInfo.count}`);
  console.log(`   ⏭️  Пропущено (дубликаты): ${skippedCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log(`   🎯 Цель: ${CONFIG.totalImages} изображений`);
  console.log(`   ⏱️  Время загрузки: ${formatTime(totalTime)}`);
  console.log(`   📁 Папка: ${path.resolve(CONFIG.outputDir)}`);
  console.log('='.repeat(60));
  
  // Проверка результата
  if (finalExistingInfo.count >= CONFIG.totalImages) {
    console.log(`\n✅ ЦЕЛЬ ДОСТИГНУТА! Загружено ${finalExistingInfo.count}/${CONFIG.totalImages} изображений`);
  } else if (finalExistingInfo.count >= CONFIG.totalImages * 0.9) {
    console.log(`\n✅ Почти успех! Загружено ${finalExistingInfo.count}/${CONFIG.totalImages} (${Math.round(finalExistingInfo.count/CONFIG.totalImages*100)}%)`);
    console.log(`   💡 Осталось загрузить: ${CONFIG.totalImages - finalExistingInfo.count} изображений`);
    console.log(`   🔄 Запустите скрипт еще раз для продолжения`);
  } else if (errorCount > needToDownload * 0.3) {
    console.log('\n⚠️  ВНИМАНИЕ: Много ошибок! Проверьте:');
    console.log('   - Подключение к интернету');
    console.log('   - Правильность API ключа');
    console.log('   - Rate limit Pexels API (200 requests/hour)');
    console.log(`   💡 Уже загружено: ${finalExistingInfo.count}/${CONFIG.totalImages}`);
    console.log(`   🔄 Запустите скрипт еще раз после паузы`);
  } else {
    console.log(`\n📊 Прогресс: ${finalExistingInfo.count}/${CONFIG.totalImages} изображений`);
    console.log(`   💡 Осталось: ${CONFIG.totalImages - finalExistingInfo.count} изображений`);
    console.log(`   🔄 Запустите скрипт еще раз для продолжения`);
  }
  
  console.log('\n💡 Следующие шаги:');
  console.log('   1. Проверьте изображения в папке public/media/faces/');
  console.log('   2. Используйте скрипт update_database_media_paths.py для обновления БД');
  console.log('   3. Или используйте эти изображения как дефолтные аватары');
  console.log('\n📜 ЛИЦЕНЗИЯ: Все изображения распространяются под Pexels License');
  console.log('   ✅ Можно использовать коммерчески');
  console.log('   ✅ НЕ требуется атрибуция фотографа');
  console.log('   ✅ Можно модифицировать\n');
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Использование: node scripts/download-female-avatars.js [опции]

Опции:
  --api-key KEY  API ключ Pexels (обязательно, если не в env)
  --count N      Количество изображений (по умолчанию: ${CONFIG.totalImages})
  --size SIZE    Размер: tiny, small, medium, large, large2x (по умолчанию: ${CONFIG.imageSize})
  --output DIR   Папка для сохранения (по умолчанию: ${CONFIG.outputDir})
  --help, -h     Показать эту справку

Примеры:
  # С API key из переменной окружения
  set PEXELS_API_KEY=your_key_here
  node scripts/download-female-avatars.js

  # С API key как аргумент
  node scripts/download-female-avatars.js --api-key your_key_here

  # С дополнительными параметрами
  node scripts/download-female-avatars.js --api-key your_key --count 100
  node scripts/download-female-avatars.js --api-key your_key --size large --output public/media/avatars

📝 Получение API ключа:
  1. Регистрация: https://www.pexels.com/api/
  2. Создайте приложение в Dashboard
  3. Скопируйте API Key (бесплатно!)

⚠️  ВАЖНО:
  - Pexels имеет rate limit: 200 запросов/час
  - Скрипт автоматически делает паузы для соблюдения лимитов
  - Изображения под Pexels License (коммерческое использование БЕЗ атрибуции)
  - Можно указать API key через переменную окружения PEXELS_API_KEY
`);
  process.exit(0);
}

// Парсинг аргументов
const apiKeyIndex = args.indexOf('--api-key');
if (apiKeyIndex !== -1 && args[apiKeyIndex + 1]) {
  CONFIG.apiKey = args[apiKeyIndex + 1];
}

const countIndex = args.indexOf('--count');
if (countIndex !== -1 && args[countIndex + 1]) {
  CONFIG.totalImages = parseInt(args[countIndex + 1]);
}

const sizeIndex = args.indexOf('--size');
if (sizeIndex !== -1 && args[sizeIndex + 1]) {
  const validSizes = ['tiny', 'small', 'medium', 'large', 'large2x'];
  const size = args[sizeIndex + 1];
  if (validSizes.includes(size)) {
    CONFIG.imageSize = size;
  } else {
    console.error(`❌ Неверный размер: ${size}. Допустимые: ${validSizes.join(', ')}`);
    process.exit(1);
  }
}

const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) {
  CONFIG.outputDir = args[outputIndex + 1];
}

// Запуск
if (require.main === module) {
  downloadAllImages().catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error('\n💡 Проверьте:');
    console.error('   - API ключ правильный');
    console.error('   - Подключение к интернету');
    console.error('   - Rate limit не превышен (200 req/hour)');
    process.exit(1);
  });
}

module.exports = { downloadAllImages };
