-- AlterTable
-- Изменяем дефолтное значение isAutoAnswerInChat с true на false для НОВЫХ пользователей
-- Существующие пользователи сохраняют свои текущие значения
ALTER TABLE "users" ALTER COLUMN "isAutoAnswerInChat" SET DEFAULT false;
