-- AlterTable
ALTER TABLE "emotions" ADD COLUMN "storyId" TEXT;

-- CreateIndex
CREATE INDEX "emotions_storyId_idx" ON "emotions"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "emotions_userId_storyId_emotionId_key" ON "emotions"("userId", "storyId", "emotionId");

-- AddForeignKey
ALTER TABLE "emotions" ADD CONSTRAINT "emotions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

