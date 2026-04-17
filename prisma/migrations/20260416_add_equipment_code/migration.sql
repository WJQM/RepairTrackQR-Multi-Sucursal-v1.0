-- Add code column with empty default (so existing rows don't violate NOT NULL)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT '';

-- Backfill existing equipment with sequential codes per branch (EQ-1, EQ-2, ...)
-- Uses ROW_NUMBER() ordered by createdAt to keep the earliest-created as EQ-1
WITH numbered AS (
  SELECT
    id,
    'EQ-' || ROW_NUMBER() OVER (PARTITION BY "branchId" ORDER BY "createdAt" ASC) AS new_code
  FROM "Equipment"
  WHERE code = '' OR code IS NULL
)
UPDATE "Equipment" e
SET code = n.new_code
FROM numbered n
WHERE e.id = n.id;

-- Unique per branch (same rule as Repair/Certificate)
CREATE UNIQUE INDEX IF NOT EXISTS "Equipment_code_branchId_key" ON "Equipment"("code", "branchId");
