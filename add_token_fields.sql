-- Добавляем поля для JWT токенов в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token TEXT,
ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP;

-- Создаем индекс для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);

-- Создаем индекс для поиска по истечению токена
CREATE INDEX IF NOT EXISTS idx_users_token_expires ON users("tokenExpiresAt");

-- Комментарии к полям
COMMENT ON COLUMN users.token IS 'JWT token for API authentication';
COMMENT ON COLUMN users."tokenExpiresAt" IS 'Token expiration date'; 