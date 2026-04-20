-- Añadir columna code con default vacío
ALTER TABLE "Console" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT '';

-- Backfill: asignar CN-1, CN-2... por sucursal (ordenado por createdAt)
WITH numbered AS (
  SELECT
    id,
    'CN-' || ROW_NUMBER() OVER (PARTITION BY "branchId" ORDER BY "createdAt" ASC) AS new_code
  FROM "Console"
  WHERE code = '' OR code IS NULL
)
UPDATE "Console" c
SET code = n.new_code
FROM numbered n
WHERE c.id = n.id;

-- Unique por sucursal
CREATE UNIQUE INDEX IF NOT EXISTS "Console_code_branchId_key" ON "Console"("code", "branchId");
