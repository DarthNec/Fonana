-- AlterTable: Добавляем DEFAULT значение для колонки version
ALTER TABLE "versions" ALTER COLUMN "version" SET DEFAULT '1';

-- InsertData: Вставляем первую запись с version = "1" если таблица пустая
INSERT INTO "versions" ("id", "version", "createdAt", "updatedAt")
SELECT 'version-initial-001', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "versions" LIMIT 1);

