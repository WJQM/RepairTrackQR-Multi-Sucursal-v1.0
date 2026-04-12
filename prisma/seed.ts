// Run with: npx tsx prisma/seed.ts

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:1210@localhost:5432/repairtrack",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create 3 branches
  const branch1 = await prisma.branch.upsert({
    where: { id: "branch-central" },
    update: {},
    create: {
      id: "branch-central",
      name: "Sucursal Central",
      address: "Av. Principal #123",
      phone: "71234567",
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: "branch-norte" },
    update: {},
    create: {
      id: "branch-norte",
      name: "Sucursal Norte",
      address: "Zona Norte #456",
      phone: "71234568",
    },
  });

  const branch3 = await prisma.branch.upsert({
    where: { id: "branch-sur" },
    update: {},
    create: {
      id: "branch-sur",
      name: "Sucursal Sur",
      address: "Zona Sur #789",
      phone: "71234569",
    },
  });

  console.log("✅ Branches created:", branch1.name, branch2.name, branch3.name);

  // Create superadmin (no branch)
  const superadminPassword = await bcrypt.hash("admin123", 10);
  const superadmin = await prisma.user.upsert({
    where: { email: "super@repairtrack.com" },
    update: {},
    create: {
      name: "Super Administrador",
      email: "super@repairtrack.com",
      password: superadminPassword,
      role: "superadmin",
      phone: "70000000",
      branchId: null,
    },
  });
  console.log("✅ Superadmin created:", superadmin.email);

  // Create admin for branch 1
  const admin1Password = await bcrypt.hash("admin123", 10);
  const admin1 = await prisma.user.upsert({
    where: { email: "admin.central@repairtrack.com" },
    update: {},
    create: {
      name: "Admin Central",
      email: "admin.central@repairtrack.com",
      password: admin1Password,
      role: "admin",
      phone: "71111111",
      branchId: branch1.id,
    },
  });
  console.log("✅ Admin Central created:", admin1.email);

  // Create admin for branch 2
  const admin2Password = await bcrypt.hash("admin123", 10);
  const admin2 = await prisma.user.upsert({
    where: { email: "admin.norte@repairtrack.com" },
    update: {},
    create: {
      name: "Admin Norte",
      email: "admin.norte@repairtrack.com",
      password: admin2Password,
      role: "admin",
      phone: "72222222",
      branchId: branch2.id,
    },
  });
  console.log("✅ Admin Norte created:", admin2.email);

  // Create tech for branch 1
  const tech1Password = await bcrypt.hash("tech123", 10);
  const tech1 = await prisma.user.upsert({
    where: { email: "tecnico.central@repairtrack.com" },
    update: {},
    create: {
      name: "Técnico Central",
      email: "tecnico.central@repairtrack.com",
      password: tech1Password,
      role: "tech",
      phone: "73333333",
      branchId: branch1.id,
    },
  });
  console.log("✅ Técnico Central created:", tech1.email);

  // Create tech for branch 2
  const tech2Password = await bcrypt.hash("tech123", 10);
  const tech2 = await prisma.user.upsert({
    where: { email: "tecnico.norte@repairtrack.com" },
    update: {},
    create: {
      name: "Técnico Norte",
      email: "tecnico.norte@repairtrack.com",
      password: tech2Password,
      role: "tech",
      phone: "74444444",
      branchId: branch2.id,
    },
  });
  console.log("✅ Técnico Norte created:", tech2.email);

  // Create default settings
  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      companyName: "RepairTrackQR",
      slogan: "Servicio Técnico Especializado",
    },
  });
  console.log("✅ Settings created (default)");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials:");
  console.log("   Super Admin: super@repairtrack.com / admin123");
  console.log("   Admin Central: admin.central@repairtrack.com / admin123");
  console.log("   Admin Norte: admin.norte@repairtrack.com / admin123");
  console.log("   Técnico Central: tecnico.central@repairtrack.com / tech123");
  console.log("   Técnico Norte: tecnico.norte@repairtrack.com / tech123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
