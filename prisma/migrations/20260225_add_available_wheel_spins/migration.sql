-- AddColumn: Add availableWheelSpins to users table
-- Date: 2026-02-25
-- Purpose: Track available wheel spins for lottery feature
-- Default: 1 free spin for all users

ALTER TABLE "users" ADD COLUMN "availableWheelSpins" INTEGER NOT NULL DEFAULT 1;
