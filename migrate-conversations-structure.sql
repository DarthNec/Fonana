-- Миграция структуры чатов: добавление fromUserId и toUserId
-- Выполняется в несколько этапов для безопасной миграции

-- 1. Добавляем новые поля в таблицу Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "fromUserId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "toUserId" TEXT;

-- 2. Создаем временные индексы
CREATE INDEX IF NOT EXISTS "Conversation_fromUserId_idx" ON "Conversation"("fromUserId");
CREATE INDEX IF NOT EXISTS "Conversation_toUserId_idx" ON "Conversation"("toUserId");

-- 3. Мигрируем данные из _UserConversations в новые поля
-- Для каждого чата берем первого участника как fromUserId, второго как toUserId
UPDATE "Conversation" 
SET 
  "fromUserId" = (
    SELECT "B" 
    FROM "_UserConversations" 
    WHERE "_UserConversations"."A" = "Conversation"."id" 
    LIMIT 1
  ),
  "toUserId" = (
    SELECT "B" 
    FROM "_UserConversations" 
    WHERE "_UserConversations"."A" = "Conversation"."id" 
    LIMIT 1 OFFSET 1
  )
WHERE "fromUserId" IS NULL OR "toUserId" IS NULL;

-- 4. Добавляем внешние ключи
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_fromUserId_fkey" 
  FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_toUserId_fkey" 
  FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Делаем поля обязательными (после миграции данных)
ALTER TABLE "Conversation" ALTER COLUMN "fromUserId" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "toUserId" SET NOT NULL;

-- 6. Создаем уникальный индекс для предотвращения дублирования
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_fromUserId_toUserId_key" 
  ON "Conversation"("fromUserId", "toUserId");

-- 7. Удаляем старую таблицу _UserConversations (после успешной миграции)
-- DROP TABLE IF EXISTS "_UserConversations";

-- 8. Добавляем комментарии
COMMENT ON COLUMN "Conversation"."fromUserId" IS 'ID пользователя, который инициировал чат';
COMMENT ON COLUMN "Conversation"."toUserId" IS 'ID пользователя, с которым ведется чат';
COMMENT ON INDEX "Conversation_fromUserId_toUserId_key" IS 'Уникальный индекс для предотвращения дублирования чатов'; 