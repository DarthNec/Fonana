-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nickname" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "source" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metrics_userId_idx" ON "metrics"("userId");

-- CreateIndex
CREATE INDEX "metrics_deviceId_idx" ON "metrics"("deviceId");

-- CreateIndex
CREATE INDEX "metrics_createdAt_idx" ON "metrics"("createdAt");
