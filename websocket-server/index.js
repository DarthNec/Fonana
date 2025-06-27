require('dotenv').config({ path: '../.env' });
const { createWebSocketServer } = require('./src/server');
const { connectRedis } = require('./src/redis');
const { initPrisma } = require('./src/db');

const PORT = process.env.WS_PORT || 3002;

async function startServer() {
  try {
    // Инициализация подключений
    await initPrisma();
    await connectRedis();
    
    // Запуск WebSocket сервера
    const server = createWebSocketServer(PORT);
    
    console.log(`✅ WebSocket server started on port ${PORT}`);
    console.log(`📡 Waiting for connections...`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('⚠️  SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ WebSocket server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 