const jwt = require('jsonwebtoken');
const { getPrisma } = require('./db');

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️  WARNING: No JWT_SECRET or NEXTAUTH_SECRET found in environment!');
}

async function verifyToken(token) {
  try {
    // Проверяем наличие JWT секрета
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return null;
    }
    
    // Декодируем JWT токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || !decoded.sub) {
      console.log('❌ Invalid token structure');
      return null;
    }
    
    const userId = decoded.sub;
    
    // Получаем данные пользователя из БД
    const prisma = getPrisma();
    
    if (!prisma) {
      console.warn('⚠️  Prisma not available, returning basic user info from token');
      // Возвращаем базовую информацию из токена
      return {
        id: userId,
        nickname: decoded.nickname || 'User',
        fullName: decoded.name || decoded.nickname || 'User',
        isCreator: decoded.isCreator || false,
        avatar: decoded.avatar || null
      };
    }
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        isCreator: true,
        avatar: true
      }
    });
    
    if (!user) {
      console.log(`❌ User ${userId} not found in database`);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return null;
  }
}

module.exports = {
  verifyToken
};

