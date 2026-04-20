-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "repairCode" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "clientName" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_repairId_key" ON "Review"("repairId");

-- CreateIndex
CREATE INDEX "Review_branchId_createdAt_idx" ON "Review"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");
