-- CreateTable
CREATE TABLE IF NOT EXISTS "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'laptop',
    "brand" TEXT,
    "model" TEXT,
    "processor" TEXT,
    "ram" TEXT,
    "storage" TEXT,
    "storage2" TEXT,
    "screenSize" TEXT,
    "graphicsCard" TEXT,
    "os" TEXT,
    "cabinet" TEXT,
    "powerSupply" TEXT,
    "accessories" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'disponible',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "image" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_branchId_idx" ON "Equipment"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Equipment_branchId_type_idx" ON "Equipment"("branchId", "type");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
