// Запуск: node images/update-user-backgrounds-new.js

const { Client } = require('pg');

// Проверенные рабочие URL изображений для фонов пользователей (72 изображения)
const backgroundUrls = [
    "https://images.unsplash.com/photo-1502767089025-6572583495b9",       // party
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",       // lifestyle
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470",       // nature
    "https://images.unsplash.com/photo-1518770660439-4636190af475",       // IT / technology
  
    // 5–8
    "https://images.unsplash.com/photo-1555992336-03a23c4bfb0d",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  
    // 9–12
    "https://images.unsplash.com/photo-1485217988980-11786ced9454",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1531496199341-5fb2edf37a13",
  
    // 13–16
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
    "https://images.unsplash.com/photo-1461632835121-5bad729aef0f",
    "https://images.unsplash.com/photo-1470770903676-69b98201ea1c",
    "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d",
  
    // 17–20
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66",
    "https://images.unsplash.com/photo-1476610182048-b716b8518aae",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
  
    // 21–24
    "https://images.unsplash.com/photo-1441725390850-2f1f72ded3a8",
    "https://images.unsplash.com/photo-1497294815431-9365093b7331",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
  
    // 25–28
    "https://images.unsplash.com/photo-1481277542470-605612bd2d61",
    "https://images.unsplash.com/photo-1499955085172-a104c9463ece",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  
    // 29–32
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    "https://images.unsplash.com/photo-1533907650678-a7f4f1de2f16",
    "https://images.unsplash.com/photo-1462910137114-4f65c60e77e0",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
  
    // 33–36
    "https://images.unsplash.com/photo-1472134205839-2c6c23aec6e8",
    "https://images.unsplash.com/photo-1482062364825-616fd23b8fc1",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
    "https://images.unsplash.com/photo-1483058712412-4245e9b90334",
  
    // 37–40
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    "https://images.unsplash.com/photo-1446821842135-b2d4a425a0f5",
    "https://images.unsplash.com/photo-1468070454955-c5b6932bd08d",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",  // (повтор, нужно потом заменить)
  
    // 41–44
    "https://images.unsplash.com/photo-1526657500878-6764337fa2bb",
    "https://images.unsplash.com/photo-1492724441997-5dc865305da4",
    "https://images.unsplash.com/photo-1470770903676-69b98201ea1c",
    "https://images.unsplash.com/photo-1433840496883-cc17e27c8b6e",
  
    // 45–48
    "https://images.unsplash.com/photo-1487014679447-9f8336841d58",
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb",
    "https://images.unsplash.com/photo-1465101162946-4377e57745c3",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
  
    // 49–52
    "https://images.unsplash.com/photo-1503424886301-2decfeec1d38",
    "https://images.unsplash.com/photo-1516251193007-45ef944ab0b",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1445264610636-109b22cb1cc0",
  
    // 53–56
    "https://images.unsplash.com/photo-1495202337139-89c3c9ba0c2a",
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd",
    "https://images.unsplash.com/photo-1464357934491-bc0a4a75f3e9",
    "https://images.unsplash.com/photo-1481349518771-20055b2a7b24",
  
    // 57–60
    "https://images.unsplash.com/photo-1469594292607-2d3fbe69a448",
    "https://images.unsplash.com/photo-1470163395405-d2b8b23b12aa",
    "https://images.unsplash.com/photo-1482062364825-616fd23b8fc1",
    "https://images.unsplash.com/photo-1512288094934-7abc7957eb15",
  
    // 61–64
    "https://images.unsplash.com/photo-1464802686167-b939a6910659",
    "https://images.unsplash.com/photo-1504439468489-c8920d796a29",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  
    // 65–68
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
    "https://images.unsplash.com/photo-1434493789847-211a4a9c82f8",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
    "https://images.unsplash.com/photo-1470163395405-d2b8b23b12aa",
  
    // 69–72
    "https://images.unsplash.com/photo-1425321395722-b1dd54a97cf3",
    "https://images.unsplash.com/photo-1463107971871-fbac9ddb920f",
    "https://images.unsplash.com/photo-1468070454955-c5b6932bd08d",
    "https://images.unsplash.com/photo-1464639723275-45dc0acbcde5",
  
    // 73–76
    "https://images.unsplash.com/photo-1500522144261-ea64433bbe27",
    "https://images.unsplash.com/photo-1482062364825-616fd23b8fc1",
    "https://images.unsplash.com/photo-1434493789847-211a4a9c82f8",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  
    // 77–80
    "https://images.unsplash.com/photo-1470770903676-69b98201ea1c",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    "https://images.unsplash.com/photo-1461632835121-5bad729aef0f",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
  
    // 81–84
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1487014679447-9f8336841d58",
    "https://images.unsplash.com/photo-1468070454955-c5b6932bd08d",
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd",
  
    // 85–88
    "https://images.unsplash.com/photo-1464357934491-bc0a4a75f3e9",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
    "https://images.unsplash.com/photo-1481349518771-20055b2a7b24",
    "https://images.unsplash.com/photo-1504420724557-30d5d95c8a40",
  
    // 89–92
    "https://images.unsplash.com/photo-1464639723275-45dc0acbcde5",
    "https://images.unsplash.com/photo-1434493789847-211a4a9c82f8",
    "https://images.unsplash.com/photo-1463107971871-fbac9ddb920f",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
  
    // 93–96
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1472134205839-2c6c23aec6e8",
    "https://images.unsplash.com/photo-1487014679447-9f8336841d58",
    "https://images.unsplash.com/photo-1500522144261-ea64433bbe27",
  
    // 97–100
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    "https://images.unsplash.com/photo-1461632835121-5bad729aef0f",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd"
];

// Функция для получения случайного фона без повторений
function getRandomBackground(usedBackgrounds = new Set()) {
  // Создаем массив доступных фонов (исключая уже использованные)
  const availableBackgrounds = backgroundUrls.filter(url => !usedBackgrounds.has(url));
  
  // Если все фоны использованы, сбрасываем список использованных
  if (availableBackgrounds.length === 0) {
    console.log('🔄 Все фоны использованы, сбрасываю список использованных...');
    usedBackgrounds.clear();
    return backgroundUrls[Math.floor(Math.random() * backgroundUrls.length)];
  }
  
  // Выбираем случайный из доступных
  const randomIndex = Math.floor(Math.random() * availableBackgrounds.length);
  const selectedBackground = availableBackgrounds[randomIndex];
  
  // Добавляем в список использованных
  usedBackgrounds.add(selectedBackground);
  
  return selectedBackground;
}

// Основная функция
async function updateUserBackgrounds() {
  const client = new Client({
    connectionString: 'postgresql://fonana_user:fonana_pass@64.20.37.222:5432/fonana?schema=public'
  });

  try {
    console.log('🔌 Подключаюсь к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Получаем пользователей без фонового изображения или с Unsplash фонами
    console.log('🔍 Ищу пользователей для обновления фона...');
    const getUsersQuery = `
      SELECT id, nickname, "backgroundImage" 
      FROM users 
      WHERE id NOT IN ('cmbv53b7h0000qoe0vy4qwkap', 'cmc0apnf90038qoublubz4128')
      ORDER BY "createdAt" DESC
    `;
    
    const usersResult = await client.query(getUsersQuery);
    const users = usersResult.rows;
    
    console.log(`📊 Найдено пользователей для обновления фона: ${users.length}`);
    
    if (users.length === 0) {
      console.log('✨ Все пользователи уже имеют подходящие фоновые изображения!');
      return;
    }

    console.log('🎨 Начинаю обновление фоновых изображений...\n');

    let updatedCount = 0;
    const usedBackgrounds = new Set(); // Отслеживаем использованные фоны
    
    // Обновляем каждого пользователя
    for (const user of users) {
      const randomBackground = getRandomBackground(usedBackgrounds);
      
      const updateQuery = `
        UPDATE users 
        SET "backgroundImage" = $1 
        WHERE id = $2
      `;
      
      try {
        await client.query(updateQuery, [randomBackground, user.id]);
        updatedCount++;
        
        console.log(`✅ ${updatedCount}/${users.length} - Обновлен пользователь: ${user.nickname || user.id}`);
        console.log(`   🖼️  Фон: ${randomBackground.substring(0, 60)}...`);
        
        // Небольшая пауза между обновлениями
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (updateError) {
        console.error(`❌ Ошибка обновления пользователя ${user.nickname || user.id}:`, updateError.message);
      }
    }

    console.log(`\n🎉 Обновление завершено!`);
    console.log(`📈 Статистика:`);
    console.log(`   • Всего пользователей для обновления: ${users.length}`);
    console.log(`   • Успешно обновлено: ${updatedCount}`);
    console.log(`   • Ошибок: ${users.length - updatedCount}`);
    console.log(`   • Доступно фонов: ${backgroundUrls.length}`);
    console.log(`   • Использовано уникальных фонов: ${usedBackgrounds.size}`);
    console.log(`   • Осталось неиспользованных: ${backgroundUrls.length - usedBackgrounds.size}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Проверьте подключение к базе данных');
    } else if (error.code === '28P01') {
      console.error('💡 Проверьте логин и пароль для базы данных');
    } else if (error.code === '3D000') {
      console.error('💡 База данных не найдена');
    }
    
  } finally {
    try {
      await client.end();
      console.log('🔌 Подключение к базе данных закрыто');
    } catch (closeError) {
      console.error('⚠️ Ошибка при закрытии подключения:', closeError.message);
    }
  }
}

// Запуск скрипта
if (require.main === module) {
  updateUserBackgrounds()
    .then(() => {
      console.log('\n✨ Скрипт завершен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updateUserBackgrounds, backgroundUrls };
