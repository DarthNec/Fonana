-- CreateTable
CREATE TABLE "flash_sales" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT,
    "postId" TEXT,
    "subscriptionPlan" TEXT,
    "discount" DOUBLE PRECISION NOT NULL,
    "maxRedemptions" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_redemptions" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_sale_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flash_sales_creatorId_isActive_idx" ON "flash_sales"("creatorId", "isActive");

-- CreateIndex
CREATE INDEX "flash_sales_endAt_isActive_idx" ON "flash_sales"("endAt", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "flash_sale_redemptions_flashSaleId_userId_key" ON "flash_sale_redemptions"("flashSaleId", "userId");

-- AddForeignKey
ALTER TABLE "flash_sales" ADD CONSTRAINT "flash_sales_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sales" ADD CONSTRAINT "flash_sales_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_redemptions" ADD CONSTRAINT "flash_sale_redemptions_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "flash_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_redemptions" ADD CONSTRAINT "flash_sale_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
