-- Добавление поля telegramId для авторизации через Telegram
-- Migration: add_telegram_id
-- Created: 2026-02-02

-- Добавляем поле telegramId с уникальным индексом
ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramId" TEXT;

-- Создаем уникальный индекс для telegramId
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON users("telegramId");

-- Проверяем результат
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'telegramId';
