-- CreateTable
CREATE TABLE IF NOT EXISTS "Videogame" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "genre" TEXT,
    "description" TEXT,
    "size" TEXT,
    "minRequirements" TEXT,
    "recRequirements" TEXT,
    "language" TEXT,
    "rating" TEXT,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Videogame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Videogame_branchId_idx" ON "Videogame"("branchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Videogame_branchId_platform_idx" ON "Videogame"("branchId", "platform");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Videogame_branchId_fkey'
  ) THEN
    ALTER TABLE "Videogame"
      ADD CONSTRAINT "Videogame_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
