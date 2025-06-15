const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Маппинг старых хеш-имен к новым именам из БД
const avatarMapping = {
  // Эти данные нужно будет получить из БД
  // Пока используем примеры из логов
  'avatar_1749849782476_o5z14.png': null,
  'avatar_1749862008540_ioayxq.jpeg': null,
  'avatar_1749856123270_9d2h8.jpeg': null,
  'avatar_1749850012325_821dkg.jpeg': null,
  'avatar_1749909348667_bt1g8a.png': null,
};

async function fixAvatars() {
  console.log('🔧 Исправление проблемы с аватарами...\n');
  
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  
  try {
    // Получаем список всех файлов в директории
    const files = fs.readdirSync(avatarsDir);
    console.log(`📁 Найдено ${files.length} файлов в директории avatars\n`);
    
    // Разделяем файлы на старые (хеши) и новые (avatar_*)
    const oldFiles = files.filter(f => !f.startsWith('avatar_'));
    const newFiles = files.filter(f => f.startsWith('avatar_'));
    
    console.log(`📊 Статистика:`);
    console.log(`   - Старые файлы (хеши): ${oldFiles.length}`);
    console.log(`   - Новые файлы (avatar_*): ${newFiles.length}`);
    console.log('');
    
    // Проверяем какие файлы из БД отсутствуют
    const missingFiles = [];
    for (const avatarName of Object.keys(avatarMapping)) {
      const filePath = path.join(avatarsDir, avatarName);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(avatarName);
      }
    }
    
    if (missingFiles.length > 0) {
      console.log(`❌ Отсутствующие файлы (${missingFiles.length}):`);
      missingFiles.forEach(file => console.log(`   - ${file}`));
      console.log('');
    }
    
    // Создаем симлинки для отсутствующих файлов
    console.log('🔗 Создание временного решения...');
    console.log('   Для отсутствующих аватаров будем использовать заглушку\n');
    
    // Создаем заглушку если её нет
    const placeholderPath = path.join(avatarsDir, 'placeholder.png');
    if (!fs.existsSync(placeholderPath) && oldFiles.length > 0) {
      // Используем первый старый файл как заглушку
      const sourceFile = path.join(avatarsDir, oldFiles[0]);
      fs.copyFileSync(sourceFile, placeholderPath);
      console.log(`✅ Создана заглушка: placeholder.png`);
    }
    
    // Создаем симлинки для отсутствующих файлов
    let created = 0;
    for (const missingFile of missingFiles) {
      const linkPath = path.join(avatarsDir, missingFile);
      if (!fs.existsSync(linkPath) && fs.existsSync(placeholderPath)) {
        try {
          fs.symlinkSync('placeholder.png', linkPath);
          created++;
        } catch (err) {
          // Если симлинки не поддерживаются, копируем файл
          fs.copyFileSync(placeholderPath, linkPath);
          created++;
        }
      }
    }
    
    if (created > 0) {
      console.log(`✅ Создано ${created} временных файлов/симлинков`);
    }
    
    console.log('\n📝 Рекомендации:');
    console.log('1. Обновите логику загрузки аватаров чтобы сохранять правильные имена');
    console.log('2. Создайте миграцию для обновления путей в БД');
    console.log('3. Или переименуйте существующие файлы согласно записям в БД');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем исправление
fixAvatars(); 