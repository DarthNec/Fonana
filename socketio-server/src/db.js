// 🔥 FIX 2026-03-09: Используем синглтон prisma из корня проекта для предотвращения connection pool exhaustion
// socketio-server работает как микросервис, но должен использовать тот же singleton что и основное приложение
const path = require('path');
const { prisma } = require(path.resolve(__dirname, '../../lib/prisma'));

// Wrapper functions для обратной совместимости с существующим кодом
async function initPrisma() {
  try {
    // Синглтон уже инициализирован в lib/prisma.js
    // Просто проверяем подключение
    await prisma.$connect();
    console.log('✅ Prisma singleton connected to database');
    return prisma;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

function getPrisma() {
  // Возвращаем синглтон напрямую
  return prisma;
}

function isPrismaAvailable() {
  return prisma !== null;
}

module.exports = {
  initPrisma,
  getPrisma,
  isPrismaAvailable
};

