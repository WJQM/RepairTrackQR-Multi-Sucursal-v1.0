import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const user = requireAuth(request);

    // Only superadmin can import
    if (user.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el Super Admin puede importar backups" }, { status: 403 });
    }

    const backup = await request.json();

    // Validate backup structure
    if (!backup?.data || !backup?.meta?.version) {
      return NextResponse.json({ error: "Archivo de backup inválido" }, { status: 400 });
    }

    const data = backup.data;
    const stats = {
      branches: { found: 0, added: 0, skipped: 0 },
      users: { found: 0, added: 0, skipped: 0 },
      repairs: { found: 0, added: 0, skipped: 0 },
      services: { found: 0, added: 0, skipped: 0 },
      inventoryItems: { found: 0, added: 0, skipped: 0 },
      serialUnits: { found: 0, added: 0, skipped: 0 },
      software: { found: 0, added: 0, skipped: 0 },
      quotations: { found: 0, added: 0, skipped: 0 },
      notifications: { found: 0, added: 0, skipped: 0 },
      settings: { found: 0, added: 0, skipped: 0 },
    };

    // Helper: check if record exists by ID
    async function importIfMissing<T extends { id: string }>(
      tableName: keyof typeof stats,
      records: T[],
      findFn: (id: string) => Promise<any>,
      createFn: (record: T) => Promise<any>
    ) {
      if (!records || !Array.isArray(records)) return;
      stats[tableName].found = records.length;

      for (const record of records) {
        try {
          const exists = await findFn(record.id);
          if (exists) {
            stats[tableName].skipped++;
          } else {
            await createFn(record);
            stats[tableName].added++;
          }
        } catch (err: any) {
          console.error(`Error importing ${tableName} id=${record.id}:`, err?.message);
          stats[tableName].skipped++;
        }
      }
    }

    // 1. Branches
    await importIfMissing(
      "branches",
      data.branches || [],
      (id) => prisma.branch.findUnique({ where: { id } }),
      (r: any) => prisma.branch.create({
        data: {
          id: r.id,
          name: r.name,
          address: r.address || null,
          phone: r.phone || null,
          active: r.active ?? true,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 2. Users (without passwords - set default)
    const defaultPassword = await bcrypt.hash("changeme123", 10);
    await importIfMissing(
      "users",
      data.users || [],
      (id) => prisma.user.findUnique({ where: { id } }),
      (r: any) => prisma.user.create({
        data: {
          id: r.id,
          name: r.name,
          email: r.email,
          password: defaultPassword,
          role: r.role || "tech",
          status: r.status || "active",
          phone: r.phone || null,
          image: r.image || null,
          branchId: r.branchId || null,
          createdAt: new Date(r.createdAt),
        },
      })
    );

    // 3. Repairs
    await importIfMissing(
      "repairs",
      data.repairs || [],
      (id) => prisma.repair.findUnique({ where: { id } }),
      (r: any) => prisma.repair.create({
        data: {
          id: r.id,
          code: r.code,
          device: r.device,
          issue: r.issue,
          status: r.status || "pending",
          priority: r.priority || "media",
          estimatedCost: r.estimatedCost || 0,
          notes: r.notes || null,
          qrCode: r.qrCode,
          image: r.image || null,
          brand: r.brand || null,
          clientEmail: r.clientEmail || null,
          clientName: r.clientName || null,
          clientPhone: r.clientPhone || null,
          model: r.model || null,
          accessories: r.accessories || null,
          technicianId: r.technicianId || null,
          userId: r.userId,
          branchId: r.branchId,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 4. Services
    await importIfMissing(
      "services",
      data.services || [],
      (id) => prisma.service.findUnique({ where: { id } }),
      (r: any) => prisma.service.create({
        data: {
          id: r.id,
          name: r.name,
          price: r.price,
          icon: r.icon || "🔧",
          active: r.active ?? true,
          branchId: r.branchId,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 5. Inventory Items (without serials - those come next)
    await importIfMissing(
      "inventoryItems",
      data.inventoryItems || [],
      (id) => prisma.inventoryItem.findUnique({ where: { id } }),
      (r: any) => prisma.inventoryItem.create({
        data: {
          id: r.id,
          name: r.name,
          category: r.category || null,
          quantity: r.quantity || 0,
          price: r.price || 0,
          minStock: r.minStock || 5,
          active: r.active ?? true,
          branchId: r.branchId,
          image: r.image || null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 6. Serial Units
    await importIfMissing(
      "serialUnits",
      data.serialUnits || [],
      (id) => prisma.serialUnit.findUnique({ where: { id } }),
      (r: any) => prisma.serialUnit.create({
        data: {
          id: r.id,
          serialNumber: r.serialNumber,
          status: r.status || "available",
          inventoryItemId: r.inventoryItemId,
          soldTo: r.soldTo || null,
          soldAt: r.soldAt ? new Date(r.soldAt) : null,
          repairCode: r.repairCode || null,
          notes: r.notes || null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 7. Software
    await importIfMissing(
      "software",
      data.software || [],
      (id) => prisma.software.findUnique({ where: { id } }),
      (r: any) => prisma.software.create({
        data: {
          id: r.id,
          name: r.name,
          category: r.category || null,
          image: r.image || null,
          active: r.active ?? true,
          branchId: r.branchId,
          minRequirements: r.minRequirements || null,
          recRequirements: r.recRequirements || null,
          size: r.size || null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 8. Quotations
    await importIfMissing(
      "quotations",
      data.quotations || [],
      (id) => prisma.quotation.findUnique({ where: { id } }),
      (r: any) => prisma.quotation.create({
        data: {
          id: r.id,
          code: r.code,
          type: r.type || "quotation",
          clientName: r.clientName,
          clientPhone: r.clientPhone || null,
          items: r.items,
          total: r.total || 0,
          notes: r.notes || null,
          branchId: r.branchId,
          userId: r.userId,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt || r.createdAt),
        },
      })
    );

    // 9. Notifications
    await importIfMissing(
      "notifications",
      data.notifications || [],
      (id) => prisma.notification.findUnique({ where: { id } }),
      (r: any) => prisma.notification.create({
        data: {
          id: r.id,
          type: r.type,
          title: r.title,
          message: r.message,
          read: r.read ?? false,
          userId: r.userId,
          branchId: r.branchId,
          createdAt: new Date(r.createdAt),
        },
      })
    );

    // 11. Settings
    await importIfMissing(
      "settings",
      data.settings || [],
      (id) => prisma.settings.findUnique({ where: { id } }),
      (r: any) => prisma.settings.create({
        data: {
          id: r.id,
          companyName: r.companyName || "RepairTrackQR",
          slogan: r.slogan || "Servicio Técnico Especializado",
          logo: r.logo || null,
          phone: r.phone || null,
          email: r.email || null,
          address: r.address || null,
          website: r.website || null,
        },
      })
    );

    return NextResponse.json({
      success: true,
      message: "Importación completada",
      stats,
    });
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("Import error:", error);
    return NextResponse.json({ error: "Error al importar backup" }, { status: 500 });
  }
}
