-- Add containerId column to posts table for grouping related posts
-- AlterTable
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "containerId" TEXT DEFAULT NULL;

