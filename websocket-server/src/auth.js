const jwt = require('jsonwebtoken');
const { getPrisma } = require('./db');

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

async function verifyToken(token) {
  try {
    // Декодируем JWT токен
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'fonana.me',
      audience: 'fonana-websocket'
    });
    
    // Проверяем наличие userId в токене
    if (!decoded.userId && !decoded.sub) {
      console.log('⚠️  No userId in token');
      return null;
    }
    
    const userId = decoded.userId || decoded.sub;
    
    // Получаем инициализированный prisma
    let prisma;
    try {
      prisma = getPrisma();
    } catch (error) {
      console.error('❌ Prisma not initialized:', error.message);
      return null;
    }
    
    // Получаем пользователя из БД для актуализации данных
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        name: true,
        wallet: true,
        isCreator: true,
        isVerified: true
      }
    });
    
    if (!user) {
      console.log(`⚠️  User ${userId} not found in database`);
      return null;
    }
    
    console.log(`✅ Token verified for user ${user.nickname || user.id}`);
    return user;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('⚠️  Token expired at', error.expiredAt);
    } else if (error.name === 'JsonWebTokenError') {
      console.log('⚠️  Invalid token:', error.message);
    } else {
      console.error('❌ Token verification error:', error);
    }
    return null;
  }
}

// Создание JWT токена для тестирования
function createToken(userId, expiresIn = '30m') {
  return jwt.sign(
    { 
      userId, 
      sub: userId 
    },
    JWT_SECRET,
    { 
      expiresIn,
      issuer: 'fonana.me',
      audience: 'fonana-websocket'
    }
  );
}

module.exports = {
  verifyToken,
  createToken
}; 