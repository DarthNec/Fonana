-- CreateTable
CREATE TABLE "AI_Creations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,

    CONSTRAINT "AI_Creations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AI_Creations_user_id_idx" ON "AI_Creations"("user_id");

-- CreateIndex
CREATE INDEX "AI_Creations_requestId_idx" ON "AI_Creations"("requestId");

