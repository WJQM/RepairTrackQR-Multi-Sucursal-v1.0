-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashMovement_branchId_createdAt_idx" ON "CashMovement"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_branchId_type_createdAt_idx" ON "CashMovement"("branchId", "type", "createdAt");
