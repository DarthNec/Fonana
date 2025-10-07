-- Add referalCount column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referalCount" INTEGER NOT NULL DEFAULT 0;
