// Скрипт для назначения CDN аватаров пользователям с дефолтными/пустыми аватарами
// Запуск: node scripts/assign-cdn-avatars.js
//
// ЧТО ДЕЛАЕТ:
// 1. Находит пользователей с "плохими" аватарами (null, /media, dicebear)
// 2. Назначает им уникальные аватары из CDN
// 3. Отслеживает использованные аватары (не повторяется)

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Настройки
const CONFIG = {
  // База данных (удаленная БД)
  db: {
    host: '64.20.37.222',
    port: 5432,
    database: 'fonana',
    user: 'fonana_user',
    password: 'fonana_pass'
  },
  
  // CDN путь для новых аватаров
  cdnBasePath: 'https://fonanastorage.b-cdn.net/avatars/default/',
  
  // Локальная папка с аватарами (для получения списка файлов)
  localAvatarsDir: 'public/media/faces',
  
  // Файл для отслеживания использованных аватаров
  usedAvatarsFile: 'scripts/.used-avatars.json',
  
  // Dry run (тестовый режим без изменений в БД)
  dryRun: false,
  
  // Лимит пользователей для обработки (0 = все)
  limit: 0
};

// Получить список доступных аватаров
function getAvailableAvatars() {
  const avatarsDir = path.join(__dirname, '..', CONFIG.localAvatarsDir);
  
  if (!fs.existsSync(avatarsDir)) {
    console.error(`❌ Папка не найдена: ${avatarsDir}`);
    console.log('💡 Сначала запустите: node scripts/download-female-avatars.js');
    process.exit(1);
  }
  
  const files = fs.readdirSync(avatarsDir);
  const avatarFiles = files
    .filter(f => f.startsWith('female-portrait-') && f.endsWith('.jpg'))
    .sort(); // Сортируем для консистентности
  
  console.log(`📁 Найдено аватаров в папке: ${avatarFiles.length}`);
  return avatarFiles;
}

// Загрузить список использованных аватаров
function loadUsedAvatars() {
  const filePath = path.join(__dirname, path.basename(CONFIG.usedAvatarsFile));
  
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    const used = JSON.parse(data);
    console.log(`📋 Загружено использованных аватаров: ${used.length}`);
    return new Set(used);
  }
  
  console.log(`📋 Файл использованных аватаров не найден (будет создан)`);
  return new Set();
}

// Сохранить список использованных аватаров
function saveUsedAvatars(usedSet) {
  const filePath = path.join(__dirname, path.basename(CONFIG.usedAvatarsFile));
  const data = JSON.stringify(Array.from(usedSet), null, 2);
  fs.writeFileSync(filePath, data, 'utf8');
  console.log(`💾 Сохранено использованных аватаров: ${usedSet.size}`);
}

// Проверка "плохого" аватара
function isBadAvatar(avatar) {
  if (!avatar || avatar === 'null' || avatar === 'undefined') {
    return true; // null или пустой
  }
  
  if (avatar.includes('api.dicebear.com')) {
    return true; // DiceBear SVG
  }
  
  // Уже CDN аватар - пропускаем
  if (avatar.startsWith('https://fonanastorage.b-cdn.net/avatars/')) {
    return false;
  }
  
  // /media/ аватары оставляем как есть - НЕ трогаем
  if (avatar.startsWith('/media/')) {
    return false;
  }
  
  // Остальное не трогаем
  return false;
}

// Главная функция
async function assignCdnAvatars() {
  console.log('🚀 Скрипт назначения CDN аватаров\n');
  
  // Подключение к БД
  const client = new Client(CONFIG.db);
  
  try {
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключено к БД\n');
    
    // Получаем всех пользователей
    console.log('👥 Поиск пользователей с null/dicebear аватарами (НЕ трогаем /media)...');
    
    let query = `
      SELECT id, nickname, avatar 
      FROM users 
      ORDER BY "createdAt" ASC
    `;
    
    if (CONFIG.limit > 0) {
      query += ` LIMIT ${CONFIG.limit}`;
    }
    
    const result = await client.query(query);
    const allUsers = result.rows;
    
    console.log(`   📊 Всего пользователей: ${allUsers.length}`);
    
    // Фильтруем пользователей с "плохими" аватарами
    const usersToUpdate = allUsers.filter(user => isBadAvatar(user.avatar));
    
    console.log(`   🎯 Нужно обновить: ${usersToUpdate.length}`);
    console.log(`   ✅ Уже с CDN аватарами: ${allUsers.length - usersToUpdate.length}\n`);
    
    if (usersToUpdate.length === 0) {
      console.log('🎉 Все пользователи уже имеют правильные аватары!');
      await client.end();
      return;
    }
    
    // Получаем доступные аватары
    const availableAvatars = getAvailableAvatars();
    const usedAvatars = loadUsedAvatars();
    
    // Фильтруем еще не использованные
    const unusedAvatars = availableAvatars.filter(avatar => !usedAvatars.has(avatar));
    
    console.log(`\n📊 Статистика аватаров:`);
    console.log(`   📁 Всего аватаров: ${availableAvatars.length}`);
    console.log(`   ✅ Использовано: ${usedAvatars.size}`);
    console.log(`   🆕 Доступно: ${unusedAvatars.length}`);
    
    if (unusedAvatars.length === 0) {
      console.log('\n⚠️  ВНИМАНИЕ: Все аватары уже использованы!');
      console.log('💡 Варианты:');
      console.log('   1. Загрузите больше аватаров: node scripts/download-female-avatars.js --count 300');
      console.log('   2. Сбросьте список использованных: удалите scripts/.used-avatars.json');
      console.log('   3. Разрешите повторное использование (будет случайное распределение)');
      
      // Используем все аватары заново
      console.log('\n🔄 Использую все аватары заново...');
      usedAvatars.clear();
      unusedAvatars.push(...availableAvatars);
    }
    
    if (usersToUpdate.length > unusedAvatars.length) {
      console.log(`\n⚠️  ВНИМАНИЕ: Пользователей (${usersToUpdate.length}) больше чем аватаров (${unusedAvatars.length})`);
      console.log(`💡 Некоторые аватары будут переиспользованы`);
    }
    
    // Dry run предупреждение
    if (CONFIG.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - изменения НЕ будут сохранены в БД\n');
    } else {
      console.log('\n🔄 Начинаю обновление пользователей...\n');
    }
    
    // Обновляем пользователей
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      
      // Выбираем аватар (циклически если не хватает)
      const avatarIndex = i % unusedAvatars.length;
      const avatarFilename = unusedAvatars[avatarIndex];
      const newAvatarUrl = `${CONFIG.cdnBasePath}${avatarFilename}`;
      
      try {
        console.log(`[${i + 1}/${usersToUpdate.length}] ${user.nickname || user.id.substring(0, 8)}`);
        console.log(`   ❌ Старый: ${user.avatar || 'null'}`);
        console.log(`   ✅ Новый:  ${newAvatarUrl}`);
        
        if (!CONFIG.dryRun) {
          await client.query(
            'UPDATE users SET avatar = $1 WHERE id = $2',
            [newAvatarUrl, user.id]
          );
        }
        
        // Отмечаем аватар как использованный
        usedAvatars.add(avatarFilename);
        updatedCount++;
        
        // Прогресс каждые 10 пользователей
        if ((i + 1) % 10 === 0) {
          console.log(`\n📈 Прогресс: ${i + 1}/${usersToUpdate.length} (${Math.round((i + 1) / usersToUpdate.length * 100)}%)\n`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Ошибка: ${error.message}\n`);
      }
    }
    
    // Сохраняем список использованных аватаров
    if (!CONFIG.dryRun) {
      saveUsedAvatars(usedAvatars);
    }
    
    // Финальная статистика
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ОБНОВЛЕНИЕ ЗАВЕРШЕНО!\n');
    console.log(`📊 Финальная статистика:`);
    console.log(`   ✅ Успешно обновлено: ${updatedCount}`);
    console.log(`   ❌ Ошибок: ${errorCount}`);
    console.log(`   📁 Использовано аватаров: ${usedAvatars.size}`);
    console.log(`   🆕 Осталось неиспользованных: ${availableAvatars.length - usedAvatars.size}`);
    
    if (CONFIG.dryRun) {
      console.log(`\n⚠️  DRY RUN - изменения НЕ применены к БД`);
      console.log(`💡 Для реального обновления уберите dryRun: false в CONFIG`);
    } else {
      console.log(`\n✅ Изменения применены к базе данных`);
    }
    
    console.log('='.repeat(60));
    
    // Проверка финального состояния
    console.log('\n🔍 Проверка финального состояния...');
    const checkResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN avatar IS NULL OR avatar = 'null' THEN 1 END) as null_count,
        COUNT(CASE WHEN avatar LIKE '/media/%' THEN 1 END) as local_count,
        COUNT(CASE WHEN avatar LIKE '%dicebear%' THEN 1 END) as dicebear_count,
        COUNT(CASE WHEN avatar LIKE 'https://fonanastorage.b-cdn.net/avatars/%' THEN 1 END) as cdn_count
      FROM users
    `);
    
    const stats = checkResult.rows[0];
    console.log(`\n📊 Статистика аватаров в БД:`);
    console.log(`   👥 Всего пользователей: ${stats.total}`);
    console.log(`   🌐 CDN аватары: ${stats.cdn_count}`);
    console.log(`   📂 Локальные (/media): ${stats.local_count}`);
    console.log(`   🎨 DiceBear: ${stats.dicebear_count}`);
    console.log(`   ❌ Null/пустые: ${stats.null_count}`);
    
    const cdnPercentage = Math.round((stats.cdn_count / stats.total) * 100);
    console.log(`\n🎯 Покрытие CDN аватарами: ${cdnPercentage}%`);
    
    if (cdnPercentage >= 90) {
      console.log('✅ Отлично! Почти все пользователи с CDN аватарами');
    } else if (cdnPercentage >= 50) {
      console.log('⚠️  Хорошо, но можно лучше. Запустите скрипт еще раз если остались пользователи без аватаров');
    } else {
      console.log('⚠️  Низкое покрытие. Проверьте логи на ошибки');
    }
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    console.error('\n💡 Проверьте:');
    console.error('   - База данных запущена');
    console.error('   - Правильные данные подключения в CONFIG');
    console.error('   - Таблица users существует');
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Отключено от БД');
  }
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Использование: node scripts/assign-cdn-avatars.js [опции]

Опции:
  --dry-run          Тестовый режим (без изменений в БД)
  --limit N          Обработать только N пользователей
  --reset-used       Сбросить список использованных аватаров
  --db-host HOST     Хост БД (по умолчанию: localhost)
  --db-port PORT     Порт БД (по умолчанию: 5432)
  --help, -h         Показать эту справку

Примеры:
  # Тестовый запуск (без изменений)
  node scripts/assign-cdn-avatars.js --dry-run

  # Обновить только 50 пользователей
  node scripts/assign-cdn-avatars.js --limit 50

  # Сбросить и начать заново
  node scripts/assign-cdn-avatars.js --reset-used

  # Подключиться к удаленной БД
  node scripts/assign-cdn-avatars.js --db-host 64.20.37.222

  # Реальное обновление всех пользователей
  node scripts/assign-cdn-avatars.js

⚠️  ВАЖНО:
  - Сначала загрузите аватары на CDN: https://fonanastorage.b-cdn.net/avatars/default/
  - Убедитесь что файлы доступны по ссылкам
  - Сделайте backup БД перед массовым обновлением
  - Используйте --dry-run для тестирования
`);
  process.exit(0);
}

// Парсинг аргументов
if (args.includes('--dry-run')) {
  CONFIG.dryRun = true;
  console.log('⚠️  DRY RUN MODE включен\n');
}

const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  CONFIG.limit = parseInt(args[limitIndex + 1]);
  console.log(`⚠️  Лимит установлен: ${CONFIG.limit} пользователей\n`);
}

if (args.includes('--reset-used')) {
  const filePath = path.join(__dirname, path.basename(CONFIG.usedAvatarsFile));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('🗑️  Список использованных аватаров сброшен\n');
  }
}

const hostIndex = args.indexOf('--db-host');
if (hostIndex !== -1 && args[hostIndex + 1]) {
  CONFIG.db.host = args[hostIndex + 1];
}

const portIndex = args.indexOf('--db-port');
if (portIndex !== -1 && args[portIndex + 1]) {
  CONFIG.db.port = parseInt(args[portIndex + 1]);
}

// Запуск
if (require.main === module) {
  assignCdnAvatars().catch(error => {
    console.error('\n❌ НЕОЖИДАННАЯ ОШИБКА:', error);
    process.exit(1);
  });
}

module.exports = { assignCdnAvatars };
