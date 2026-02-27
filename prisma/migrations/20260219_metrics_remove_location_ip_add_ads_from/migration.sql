-- AlterTable: Remove location and ip columns, add ads_from column
ALTER TABLE "metrics" DROP COLUMN "location";
ALTER TABLE "metrics" DROP COLUMN "ip";
ALTER TABLE "metrics" ADD COLUMN "ads_from" TEXT;
