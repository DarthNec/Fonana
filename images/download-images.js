// Скрипт для загрузки фоновых изображений
// Запуск: node images/download-images.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// Список разноцветных градиентных фонов с Unsplash
const imageUrls = [
  // 🟣 Фиолетовые градиенты
  {
    name: 'bg-purple-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
    description: 'Фиолетовый градиент #1'
  },
  {
    name: 'bg-purple-gradient-2.jpg',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
    description: 'Фиолетовый градиент #2'
  },
  {
    name: 'bg-purple-pink.jpg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    description: 'Фиолетово-розовый градиент'
  },

  // 🔵 Синие градиенты
  {
    name: 'bg-blue-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop',
    description: 'Синий градиент #1'
  },
  {
    name: 'bg-blue-gradient-2.jpg',
    url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1920&h=1080&fit=crop',
    description: 'Синий градиент #2'
  },
  {
    name: 'bg-blue-teal.jpg',
    url: 'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1920&h=1080&fit=crop',
    description: 'Сине-бирюзовый градиент'
  },

  // 🟢 Зеленые градиенты
  {
    name: 'bg-green-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557682260-96773eb01377?w=1920&h=1080&fit=crop',
    description: 'Зеленый градиент #1'
  },
  {
    name: 'bg-green-gradient-2.jpg',
    url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1920&h=1080&fit=crop',
    description: 'Зеленый градиент #2'
  },
  {
    name: 'bg-green-lime.jpg',
    url: 'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?w=1920&h=1080&fit=crop',
    description: 'Зелено-лаймовый градиент'
  },

  // 🔴 Красные и розовые градиенты
  {
    name: 'bg-red-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1920&h=1080&fit=crop',
    description: 'Красный градиент #1'
  },
  {
    name: 'bg-pink-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=1920&h=1080&fit=crop',
    description: 'Розовый градиент #1'
  },
  {
    name: 'bg-red-orange.jpg',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop',
    description: 'Красно-оранжевый градиент'
  },

  // 🟡 Желтые и оранжевые градиенты
  {
    name: 'bg-orange-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop',
    description: 'Оранжевый градиент #1'
  },
  {
    name: 'bg-yellow-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1920&h=1080&fit=crop',
    description: 'Желтый градиент #1'
  },
  {
    name: 'bg-sunset-gradient.jpg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    description: 'Закатный градиент'
  },

  // ⚫ Темные градиенты
  {
    name: 'bg-dark-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
    description: 'Темный градиент #1'
  },
  {
    name: 'bg-dark-gradient-2.jpg',
    url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1920&h=1080&fit=crop',
    description: 'Темный градиент #2'
  },
  {
    name: 'bg-black-purple.jpg',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
    description: 'Черно-фиолетовый градиент'
  },

  // 🌈 Многоцветные градиенты
  {
    name: 'bg-rainbow-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
    description: 'Радужный градиент #1'
  },
  {
    name: 'bg-rainbow-gradient-2.jpg',
    url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop',
    description: 'Радужный градиент #2'
  },

  // 🎨 Специальные цвета для криптопроекта
  {
    name: 'bg-solana-style.jpg',
    url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&h=1080&fit=crop',
    description: 'Solana-стиль градиент'
  },
  {
    name: 'bg-neon-cyber.jpg',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&h=1080&fit=crop',
    description: 'Неоновый киберпанк'
  },
  {
    name: 'bg-holographic.jpg',
    url: 'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1920&h=1080&fit=crop',
    description: 'Голографический эффект'
  },

  // ⚪ Светлые градиенты
  {
    name: 'bg-light-gradient-1.jpg',
    url: 'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?w=1920&h=1080&fit=crop',
    description: 'Светлый градиент #1'
  },
  {
    name: 'bg-pastel-gradient.jpg',
    url: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=1920&h=1080&fit=crop',
    description: 'Пастельный градиент'
  }
];

// Функция для загрузки изображения
function downloadImage(imageData) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, imageData.name);
    const file = fs.createWriteStream(filePath);
    
    console.log(\`Загружаю: \${imageData.description}...\`);
    
    https.get(imageData.url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(\`✅ Загружено: \${imageData.name}\`);
          resolve();
        });
      } else {
        console.log(\`❌ Ошибка загрузки \${imageData.name}: \${response.statusCode}\`);
        reject(new Error(\`HTTP \${response.statusCode}\`));
      }
    }).on('error', (err) => {
      console.log(\`❌ Ошибка: \${err.message}\`);
      reject(err);
    });
  });
}

// Основная функция
async function downloadAllImages() {
  console.log('🚀 Начинаю загрузку фоновых изображений...\n');
  
  try {
    for (const imageData of imageUrls) {
      await downloadImage(imageData);
      // Пауза между загрузками
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(\`\n🎉 Успешно загружено \${imageUrls.length} изображений!\`);
    console.log('📁 Файлы сохранены в папке images/');
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке:', error.message);
  }
}

// Запуск
if (require.main === module) {
  downloadAllImages();
}

module.exports = { downloadAllImages };
