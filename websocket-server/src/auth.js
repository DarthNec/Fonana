const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

async function verifyToken(token) {
  try {
    // Декодируем JWT токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Проверяем наличие userId в токене
    if (!decoded.userId && !decoded.sub) {
      console.log('⚠️  No userId in token');
      return null;
    }
    
    const userId = decoded.userId || decoded.sub;
    
    // Получаем пользователя из БД
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        name: true,
        wallet: true,
        isCreator: true
      }
    });
    
    if (!user) {
      console.log(`⚠️  User ${userId} not found`);
      return null;
    }
    
    console.log(`✅ Token verified for user ${user.nickname || user.id}`);
    return user;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('⚠️  Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('⚠️  Invalid token');
    } else {
      console.error('❌ Token verification error:', error);
    }
    return null;
  }
}

// Создание JWT токена для тестирования
function createToken(userId, expiresIn = '7d') {
  return jwt.sign(
    { userId, sub: userId },
    JWT_SECRET,
    { expiresIn }
  );
}

module.exports = {
  verifyToken,
  createToken
}; 