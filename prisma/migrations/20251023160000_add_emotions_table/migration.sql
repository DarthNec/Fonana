-- CreateTable
CREATE TABLE "emotions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "emotionId" INTEGER NOT NULL,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emotions_postId_idx" ON "emotions"("postId");

-- CreateIndex
CREATE INDEX "emotions_commentId_idx" ON "emotions"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "emotions_userId_postId_emotionId_key" ON "emotions"("userId", "postId", "emotionId");

-- CreateIndex
CREATE UNIQUE INDEX "emotions_userId_commentId_emotionId_key" ON "emotions"("userId", "commentId", "emotionId");

-- AddForeignKey
ALTER TABLE "emotions" ADD CONSTRAINT "emotions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotions" ADD CONSTRAINT "emotions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotions" ADD CONSTRAINT "emotions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

