-- Add error column to posts table for AI video generation errors
-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "error" TEXT DEFAULT NULL;






