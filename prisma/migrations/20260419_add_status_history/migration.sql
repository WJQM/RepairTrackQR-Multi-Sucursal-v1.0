-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusHistory_repairId_createdAt_idx" ON "StatusHistory"("repairId", "createdAt");
