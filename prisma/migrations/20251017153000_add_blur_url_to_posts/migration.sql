-- Add blurUrl column to posts table for blurred preview of locked content
-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "blurUrl" TEXT DEFAULT NULL;

