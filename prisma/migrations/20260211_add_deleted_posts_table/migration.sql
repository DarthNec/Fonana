-- CreateTable
CREATE TABLE "deleted_posts" (
    "id" TEXT NOT NULL,
    "originalPostId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "thumbnail" TEXT,
    "mediaUrl" TEXT,
    "blurUrl" TEXT,
    "previewUrl" TEXT,
    "isLocked" BOOLEAN NOT NULL,
    "isPremium" BOOLEAN NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "imageAspectRatio" DECIMAL(65,30),
    "isSellable" BOOLEAN NOT NULL,
    "minSubscriptionTier" TEXT,
    "requestId" TEXT,
    "error" TEXT,
    "remixId" TEXT,
    "containerId" TEXT,
    "likesCount" INTEGER NOT NULL,
    "commentsCount" INTEGER NOT NULL,
    "viewsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" TEXT,
    "deletionReason" TEXT,

    CONSTRAINT "deleted_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deleted_posts_originalPostId_idx" ON "deleted_posts"("originalPostId");

-- CreateIndex
CREATE INDEX "deleted_posts_creatorId_idx" ON "deleted_posts"("creatorId");

-- CreateIndex
CREATE INDEX "deleted_posts_deletedAt_idx" ON "deleted_posts"("deletedAt");
