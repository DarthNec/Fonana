/*
  Warnings:

  - A unique constraint covering the columns `[postPurchaseId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'POST_PURCHASE';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "postPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "post_purchases" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "txSignature" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "platformFee" DOUBLE PRECISION,
    "referrerFee" DOUBLE PRECISION,
    "creatorAmount" DOUBLE PRECISION,

    CONSTRAINT "post_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_purchases_userId_postId_key" ON "post_purchases"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_postPurchaseId_key" ON "transactions"("postPurchaseId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_postPurchaseId_fkey" FOREIGN KEY ("postPurchaseId") REFERENCES "post_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_purchases" ADD CONSTRAINT "post_purchases_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_purchases" ADD CONSTRAINT "post_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
