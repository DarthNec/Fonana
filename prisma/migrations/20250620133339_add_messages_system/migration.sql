-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'MESSAGE_PURCHASE';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "receiverId" TEXT,
ADD COLUMN     "senderId" TEXT;
