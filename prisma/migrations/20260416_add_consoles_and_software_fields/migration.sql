-- Software: nuevos campos opcionales (descripción, idioma, clasificación)
ALTER TABLE "Software" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Software" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "Software" ADD COLUMN IF NOT EXISTS "rating" TEXT;

-- Console: nueva tabla
CREATE TABLE IF NOT EXISTS "Console" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "state" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "storage" TEXT,
    "generation" TEXT,
    "accessories" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'disponible',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Console_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Console_branchId_idx" ON "Console"("branchId");
CREATE INDEX IF NOT EXISTS "Console_branchId_category_idx" ON "Console"("branchId", "category");
CREATE INDEX IF NOT EXISTS "Console_branchId_condition_idx" ON "Console"("branchId", "condition");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Console_branchId_fkey'
  ) THEN
    ALTER TABLE "Console"
      ADD CONSTRAINT "Console_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
