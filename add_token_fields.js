const { Client } = require('pg');

async function addTokenFields() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'fonana',
    user: 'fonana_user',
    password: 'fonana_pass'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Добавляем поля для JWT токенов
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS token TEXT,
      ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP;
    `);
    console.log('✅ Added token fields to users table');

    // Создаем индексы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
      CREATE INDEX IF NOT EXISTS idx_users_token_expires ON users("tokenExpiresAt");
    `);
    console.log('✅ Created indexes for token fields');

    // Добавляем комментарии
    await client.query(`
      COMMENT ON COLUMN users.token IS 'JWT token for API authentication';
      COMMENT ON COLUMN users."tokenExpiresAt" IS 'Token expiration date';
    `);
    console.log('✅ Added comments to token fields');

    console.log('🎉 Token fields successfully added to database!');

  } catch (error) {
    console.error('❌ Error adding token fields:', error);
  } finally {
    await client.end();
  }
}

addTokenFields(); 