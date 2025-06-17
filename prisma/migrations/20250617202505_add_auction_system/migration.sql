-- CreateEnum
CREATE TYPE "SellType" AS ENUM ('FIXED_PRICE', 'AUCTION');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "AuctionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AUCTION_NEW_BID';
ALTER TYPE "NotificationType" ADD VALUE 'AUCTION_WON';
ALTER TYPE "NotificationType" ADD VALUE 'AUCTION_PAYMENT_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'AUCTION_DEPOSIT_REFUNDED';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "auctionDepositAmount" DOUBLE PRECISION DEFAULT 0.01,
ADD COLUMN     "auctionEndAt" TIMESTAMP(3),
ADD COLUMN     "auctionStartAt" TIMESTAMP(3),
ADD COLUMN     "auctionStartPrice" DOUBLE PRECISION,
ADD COLUMN     "auctionStatus" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "auctionStepPrice" DOUBLE PRECISION,
ADD COLUMN     "isSellable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellType" "SellType",
ADD COLUMN     "sellerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "soldPrice" DOUBLE PRECISION,
ADD COLUMN     "soldToId" TEXT;

-- CreateTable
CREATE TABLE "auction_deposits" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "txSignature" TEXT NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),
    "refundTxSignature" TEXT,
    "forfeitedAt" TIMESTAMP(3),

    CONSTRAINT "auction_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isWinning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_payments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "txSignature" TEXT,
    "status" "AuctionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "sellerConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auction_deposits_userId_status_idx" ON "auction_deposits"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auction_deposits_postId_userId_key" ON "auction_deposits"("postId", "userId");

-- CreateIndex
CREATE INDEX "auction_bids_postId_amount_idx" ON "auction_bids"("postId", "amount");

-- CreateIndex
CREATE INDEX "auction_bids_userId_idx" ON "auction_bids"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_payments_postId_key" ON "auction_payments"("postId");

-- CreateIndex
CREATE INDEX "auction_payments_userId_status_idx" ON "auction_payments"("userId", "status");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_soldToId_fkey" FOREIGN KEY ("soldToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_deposits" ADD CONSTRAINT "auction_deposits_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_deposits" ADD CONSTRAINT "auction_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_payments" ADD CONSTRAINT "auction_payments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_payments" ADD CONSTRAINT "auction_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
