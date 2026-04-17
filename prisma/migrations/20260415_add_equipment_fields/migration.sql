-- AlterTable - Add new fields to Equipment
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "storage2" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "cabinet" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "powerSupply" TEXT;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "accessories" TEXT;
