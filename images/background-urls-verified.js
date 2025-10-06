// Проверенные рабочие URL изображений для фонов пользователей
const verifiedBackgroundUrls = [
  // Lifestyle & Fashion
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1920&h=1080&fit=crop',
  
  // Party & Nightlife
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  
  // Dance & Movement
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1920&h=1080&fit=crop',
  
  // IT Technologies & Digital
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
  
  // Fitness & Sports
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop',
  
  // Art & Creative
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop',
  
  // Music & Entertainment
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop',
  
  // Gaming & Tech
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop',
  
  // Dark Aesthetic & Abstract
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557682257-2f9c37a3a5f3?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557682260-96773eb01377?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557682268-e3955ed5d83f?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557683304-673a23048d34?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
  
  // Luxury & Premium
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1920&h=1080&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1080&fit=crop'
];

module.exports = { verifiedBackgroundUrls };
