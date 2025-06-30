const jwt = require('jsonwebtoken');
const { getPrisma } = require('./db');

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

// Debug logging
console.log('🔑 JWT_SECRET configured:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET');
console.log('🔑 Using default key:', JWT_SECRET === 'your-secret-key');

async function verifyToken(token) {
  try {
    console.log('🔐 Verifying token...');
    console.log('🔑 Token length:', token ? token.length : 0);
    
    // DEBUG: Выводим первые и последние символы токена
    if (token) {
      console.log('🔑 Token preview:', `${token.substring(0, 50)}...${token.substring(token.length - 50)}`);
      
      // Проверяем, не закодирован ли токен в URL
      const decodedToken = decodeURIComponent(token);
      if (decodedToken !== token) {
        console.log('🔑 Token was URL encoded, decoded length:', decodedToken.length);
        token = decodedToken;
      }
    }
    
    // Декодируем JWT токен без строгой проверки issuer/audience
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Проверяем что декодирование прошло успешно
    if (!decoded) {
      console.log('⚠️  Token decoded to null/undefined');
      return null;
    }
    
    console.log('📋 Decoded token:', {
      userId: decoded.userId,
      sub: decoded.sub,
      iss: decoded.iss,
      aud: decoded.aud,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'no exp'
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