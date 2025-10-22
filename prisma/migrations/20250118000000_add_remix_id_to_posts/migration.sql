-- Add remixId column to posts table for tracking remix relationships
-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "remixId" TEXT DEFAULT NULL;

