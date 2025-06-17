const https = require('https');
const fs = require('fs');
const path = require('path');

// Freesound.org звуки - бесплатные с лицензией Creative Commons
// Подобрал приятные ASMR-подобные звуки
const sounds = {
  'notification-single.mp3': {
    // Мягкий колокольчик
    url: 'https://cdn.freesound.org/previews/411/411090_5123451-lq.mp3',
    description: 'Soft bell chime'
  },
  'notification-trill.mp3': {
    // Приятная трель
    url: 'https://cdn.freesound.org/previews/234/234524_2631614-lq.mp3', 
    description: 'Pleasant trill'
  }
};

// Создаем директорию если её нет
const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

console.log('📥 Downloading notification sounds...\n');

// Функция для загрузки файла
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Загружаем каждый звук
Promise.all(
  Object.entries(sounds).map(async ([filename, info]) => {
    const filepath = path.join(soundsDir, filename);
    
    try {
      console.log(`⏬ Downloading ${filename} - ${info.description}`);
      await downloadFile(info.url, filepath);
      console.log(`✅ Downloaded ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to download ${filename}:`, error.message);
    }
  })
).then(() => {
  console.log('\n✨ Sound download complete!');
  console.log('\n🎵 Note: These are free sounds from freesound.org');
  console.log('   If you want better quality ASMR sounds, consider:');
  console.log('   - Recording custom sounds');
  console.log('   - Purchasing premium sounds from audio marketplaces');
  console.log('   - Using AI to generate custom notification sounds');
}); 