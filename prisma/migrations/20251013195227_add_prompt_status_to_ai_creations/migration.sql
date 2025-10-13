-- AlterTable
ALTER TABLE "AI_Creations" ADD COLUMN "prompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AI_Creations" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

