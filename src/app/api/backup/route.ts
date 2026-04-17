import { prisma } from "@/lib/prisma";
import { requireAuth, getEffectiveBranchId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = requireAuth(request);

    // Only admin and superadmin can backup
    if (user.role === "tech") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const branchId = getEffectiveBranchId(request, user);

    // Build branch filter: superadmin without branch = all, otherwise scoped
    const branchFilter = branchId ? { branchId } : {};

    // Fetch all data in parallel
    const [
      branches,
      users,
      repairs,
      notifications,
      services,
      inventoryItems,
      serialUnits,
      software,
      quotations,
      certificates,
      settings,
    ] = await Promise.all([
      // Superadmin gets all branches, admin gets only their own
      user.role === "superadmin"
        ? prisma.branch.findMany({ orderBy: { createdAt: "asc" } })
        : branchId
          ? prisma.branch.findMany({ where: { id: branchId } })
          : [],

      // Users: superadmin gets all, admin gets users from their branch
      user.role === "superadmin"
        ? prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, status: true, phone: true, image: true, branchId: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          })
        : prisma.user.findMany({
            where: { branchId },
            select: { id: true, name: true, email: true, role: true, status: true, phone: true, image: true, branchId: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }),

      // Repairs
      prisma.repair.findMany({
        where: branchFilter,
        include: { technician: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),

      // Notifications
      prisma.notification.findMany({
        where: branchFilter,
        orderBy: { createdAt: "desc" },
      }),

      // Services
      prisma.service.findMany({
        where: branchFilter,
        orderBy: { createdAt: "asc" },
      }),

      // Inventory Items with serials
      prisma.inventoryItem.findMany({
        where: branchFilter,
        include: { serials: true },
        orderBy: { createdAt: "asc" },
      }),

      // Serial Units (standalone for reference)
      prisma.serialUnit.findMany({
        where: branchFilter.branchId
          ? { item: { branchId: branchFilter.branchId } }
          : {},
        orderBy: { createdAt: "asc" },
      }),

      // Software
      prisma.software.findMany({
        where: branchFilter,
        orderBy: { createdAt: "asc" },
      }),

      // Quotations
      prisma.quotation.findMany({
        where: branchFilter,
        orderBy: { createdAt: "desc" },
      }),

      // Certificates
      prisma.certificate.findMany({
        where: branchFilter,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),

      // Settings (global)
      prisma.settings.findMany(),
    ]);

    const backup = {
      meta: {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        generatedBy: { id: user.id, email: user.email, role: user.role },
        scope: branchId ? "branch" : "full",
        branchId: branchId || null,
      },
      data: {
        branches,
        users,
        repairs,
        notifications,
        services,
        inventoryItems,
        serialUnits,
        software,
        quotations,
        certificates,
        settings,
      },
      stats: {
        branches: branches.length,
        users: users.length,
        repairs: repairs.length,
        notifications: notifications.length,
        services: services.length,
        inventoryItems: inventoryItems.length,
        serialUnits: serialUnits.length,
        software: software.length,
        quotations: quotations.length,
        certificates: certificates.length,
        settings: settings.length,
      },
    };

    // Return as downloadable JSON
    const json = JSON.stringify(backup, null, 2);
    const filename = `repairtrack-backup-${branchId ? "branch" : "full"}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Error al generar backup" }, { status: 500 });
  }
}
