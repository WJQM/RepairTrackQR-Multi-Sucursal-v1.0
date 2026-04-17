-- Performance indexes for scaling to 6000+ records per branch
-- Safe: checks if table exists before creating index

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Repair') THEN
    CREATE INDEX IF NOT EXISTS "Repair_branchId_status_idx" ON "Repair"("branchId", "status");
    CREATE INDEX IF NOT EXISTS "Repair_branchId_createdAt_idx" ON "Repair"("branchId", "createdAt");
    CREATE INDEX IF NOT EXISTS "Repair_technicianId_idx" ON "Repair"("technicianId");
    CREATE INDEX IF NOT EXISTS "Repair_clientName_idx" ON "Repair"("clientName");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Notification') THEN
    CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
    CREATE INDEX IF NOT EXISTS "Notification_branchId_createdAt_idx" ON "Notification"("branchId", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Service') THEN
    CREATE INDEX IF NOT EXISTS "Service_branchId_idx" ON "Service"("branchId");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='InventoryItem') THEN
    CREATE INDEX IF NOT EXISTS "InventoryItem_branchId_idx" ON "InventoryItem"("branchId");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Software') THEN
    CREATE INDEX IF NOT EXISTS "Software_branchId_idx" ON "Software"("branchId");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Quotation') THEN
    CREATE INDEX IF NOT EXISTS "Quotation_branchId_type_createdAt_idx" ON "Quotation"("branchId", "type", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Message') THEN
    CREATE INDEX IF NOT EXISTS "Message_repairId_idx" ON "Message"("repairId");
    CREATE INDEX IF NOT EXISTS "Message_branchId_idx" ON "Message"("branchId");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Certificate') THEN
    CREATE INDEX IF NOT EXISTS "Certificate_branchId_createdAt_idx" ON "Certificate"("branchId", "createdAt");
  END IF;
END $$;
