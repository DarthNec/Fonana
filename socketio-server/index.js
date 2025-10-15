const path = require('path');
const dotenv = require('dotenv');

// Загружаем переменные окружения из корневой .env
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading environment from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('⚠️  Warning: Could not load .env file:', result.error.message);
} else {
  console.log('✅ Environment variables loaded');
}

const { createSocketIOServer } = require('./src/server');
const { initRedis } = require('./src/redis');

const PORT = process.env.SOCKETIO_PORT || 3004;

async function startServer() {
  try {
    console.log('🚀 Starting Socket.IO server...');
    
    // Инициализируем Redis (опционально)
    try {
      const redisConnected = initRedis();
      if (redisConnected) {
        console.log('✅ Redis initialized successfully');
      } else {
        console.log('⚠️  Running without Redis');
      }
    } catch (error) {
      console.error('⚠️  Redis initialization failed:', error.message);
      console.log('⚠️  Server will continue without Redis');
    }
    
    // Создаем Socket.IO сервер
    const io = createSocketIOServer(PORT);
    
    console.log(`✅ Socket.IO server started on port ${PORT}`);
    console.log('📡 Waiting for connections...');
    console.log(`🌐 Connect to: http://localhost:${PORT}`);
    console.log('👤 User authentication: Client-side (user object from client)');
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      io.close(() => {
        console.log('Socket.IO server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      io.close(() => {
        console.log('Socket.IO server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

