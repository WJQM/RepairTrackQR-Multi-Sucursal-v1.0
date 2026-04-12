-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "companyName" TEXT NOT NULL DEFAULT 'RepairTrackQR',
    "slogan" TEXT NOT NULL DEFAULT 'Servicio Técnico Especializado',
    "logo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "website" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "Settings" ("id", "companyName", "slogan", "updatedAt")
VALUES ('global', 'RepairTrackQR', 'Servicio Técnico Especializado', NOW())
ON CONFLICT ("id") DO NOTHING;
