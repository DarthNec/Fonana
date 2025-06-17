-- CreateTable
CREATE TABLE "creator_tier_settings" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "basicTier" JSONB,
    "premiumTier" JSONB,
    "vipTier" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_tier_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_tier_settings_creatorId_key" ON "creator_tier_settings"("creatorId");

-- AddForeignKey
ALTER TABLE "creator_tier_settings" ADD CONSTRAINT "creator_tier_settings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
