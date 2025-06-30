require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Проверяем загрузку переменных окружения
console.log('🔍 Checking environment variables...');
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found! Check .env file');
  process.exit(1);
}
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET not found! Check .env file');
  process.exit(1);
}
console.log('✅ Environment variables loaded');

const { createWebSocketServer } = require('./src/server');
const { initPrisma } = require('./src/db');
const { initRedis } = require('./src/redis');
const { initLogs, startStatsReporter, createMetricsEndpoint } = require('./src/monitoring');

const PORT = process.env.WS_PORT || 3002;

async function startServer() {
  try {
    // Инициализируем логирование
    await initLogs();
    console.log('✅ Logging initialized');
    
    // Инициализируем Prisma
    await initPrisma();
    
    // Инициализируем Redis
    const redisConnected = initRedis();
    
    if (redisConnected) {
      console.log('✅ Redis initialized successfully');
    } else {
      console.log('⚠️  Running in single server mode without Redis');
    }
    
    // Создаем WebSocket сервер
    const wss = createWebSocketServer(PORT);
    
    console.log(`✅ WebSocket server started on port ${PORT}`);
    console.log('📡 Waiting for connections...');
    
    // Запускаем периодический вывод статистики
    startStatsReporter(60000); // каждую минуту
    
    // Создаем HTTP endpoint для метрик
    createMetricsEndpoint();
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 