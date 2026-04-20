import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

// GET /api/reports/monthly?year=2026&month=4 — datos del mes
export async function GET(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const branchId = getEffectiveBranchId(request, user);
    const url = new URL(request.url);
    const now = new Date();
    const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const where: any = { createdAt: { gte: start, lt: end } };
    if (branchId) where.branchId = branchId;

    const [repairs, quotations, branch] = await Promise.all([
      prisma.repair.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: { technician: { select: { id: true, name: true } }, branch: { select: { name: true } } },
      }),
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: "asc" },
      }),
      branchId ? prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } }) : null,
    ]);

    // Totales por estado
    const byStatus: Record<string, number> = {};
    for (const r of repairs) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    // Ingresos por OTs entregadas
    const deliveredRepairs = repairs.filter(r => r.status === "delivered");
    const repairIncome = deliveredRepairs.reduce((s, r) => s + (Number(r.estimatedCost) || 0), 0);

    // Ingresos por ventas
    const sales = quotations.filter(q => q.type === "sale");
    const cots = quotations.filter(q => q.type === "quotation");
    const salesIncome = sales.reduce((s, q) => s + (Number(q.total) || 0), 0);

    // Desglose por técnico (solo delivered)
    const byTech: Record<string, { id: string; name: string; count: number; income: number }> = {};
    for (const r of deliveredRepairs) {
      const tid = r.technicianId || "sin";
      const tname = r.technician?.name || "Sin técnico";
      if (!byTech[tid]) byTech[tid] = { id: tid, name: tname, count: 0, income: 0 };
      byTech[tid].count++;
      byTech[tid].income += Number(r.estimatedCost) || 0;
    }

    return NextResponse.json({
      period: { year, month, label: start.toLocaleDateString("es-BO", { month: "long", year: "numeric" }) },
      branchName: branch?.name || "Todas las sucursales",
      repairs: repairs.map(r => ({
        code: r.code,
        clientName: r.clientName,
        clientPhone: r.clientPhone,
        device: [r.device, r.brand, r.model].filter(Boolean).join(" "),
        status: r.status,
        technicianName: r.technician?.name || null,
        estimatedCost: r.estimatedCost,
        createdAt: r.createdAt,
      })),
      quotations: quotations.map(q => ({
        code: q.code,
        type: q.type,
        clientName: q.clientName,
        total: q.total,
        createdAt: q.createdAt,
      })),
      summary: {
        totalRepairs: repairs.length,
        byStatus,
        deliveredCount: deliveredRepairs.length,
        repairIncome,
        salesCount: sales.length,
        salesIncome,
        quotationsCount: cots.length,
        totalIncome: repairIncome + salesIncome,
      },
      byTechnician: Object.values(byTech).sort((a, b) => b.income - a.income),
    });
  } catch (error: any) {
    console.error("[Report] Error:", error);
    return NextResponse.json({ error: "Error al generar reporte", details: error?.message }, { status: 500 });
  }
}
