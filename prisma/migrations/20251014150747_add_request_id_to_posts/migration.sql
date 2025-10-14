-- AlterTable Posts - Add requestId field
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "requestId" TEXT;

-- CreateIndex for requestId (optional, for faster queries)
CREATE INDEX IF NOT EXISTS "posts_requestId_idx" ON "posts"("requestId");


