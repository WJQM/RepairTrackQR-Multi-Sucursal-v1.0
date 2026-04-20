import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role === "tech") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const branchId = getEffectiveBranchId(request, user);
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Ingresos por OT entregadas (estimatedCost de 'delivered')
    const [revTodayRows, revWeekRows, revMonthRows, revYearRows, revAllRows] = await Promise.all([
      prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered", updatedAt: { gte: startOfDay } } }),
      prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered", updatedAt: { gte: startOfWeek } } }),
      prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered", updatedAt: { gte: startOfMonth } } }),
      prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered", updatedAt: { gte: startOfYear } } }),
      prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered" } }),
    ]);
    const revToday = Number(revTodayRows._sum.estimatedCost || 0);
    const revWeek = Number(revWeekRows._sum.estimatedCost || 0);
    const revMonth = Number(revMonthRows._sum.estimatedCost || 0);
    const revYear = Number(revYearRows._sum.estimatedCost || 0);
    const revAll = Number(revAllRows._sum.estimatedCost || 0);

    // Ingresos de Notas de Venta (type = "sale")
    const nvWhere: any = { ...where, type: "sale" };
    const [nvTodayRows, nvWeekRows, nvMonthRows, nvYearRows, nvAllRows] = await Promise.all([
      prisma.quotation.aggregate({ _sum: { total: true }, where: { ...nvWhere, createdAt: { gte: startOfDay } } }),
      prisma.quotation.aggregate({ _sum: { total: true }, where: { ...nvWhere, createdAt: { gte: startOfWeek } } }),
      prisma.quotation.aggregate({ _sum: { total: true }, where: { ...nvWhere, createdAt: { gte: startOfMonth } } }),
      prisma.quotation.aggregate({ _sum: { total: true }, where: { ...nvWhere, createdAt: { gte: startOfYear } } }),
      prisma.quotation.aggregate({ _sum: { total: true }, where: nvWhere }),
    ]);
    const nvToday = Number(nvTodayRows._sum.total || 0);
    const nvWeek = Number(nvWeekRows._sum.total || 0);
    const nvMonth = Number(nvMonthRows._sum.total || 0);
    const nvYear = Number(nvYearRows._sum.total || 0);
    const nvAll = Number(nvAllRows._sum.total || 0);

    // OTs por estado
    const byStatusRaw = await prisma.repair.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach(s => { byStatus[s.status] = s._count._all; });

    const totalRepairs = byStatusRaw.reduce((sum, s) => sum + s._count._all, 0);

    // OTs creadas por mes (últimos 6 meses)
    const last6MonthsData: { month: string; count: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [count, rev] = await Promise.all([
        prisma.repair.count({ where: { ...where, createdAt: { gte: d, lt: next } } }),
        prisma.repair.aggregate({ _sum: { estimatedCost: true }, where: { ...where, status: "delivered", updatedAt: { gte: d, lt: next } } }),
      ]);
      const label = d.toLocaleDateString("es-BO", { month: "short" });
      last6MonthsData.push({ month: label, count, revenue: Number(rev._sum.estimatedCost || 0) });
    }

    // Top técnicos (por OTs completadas o entregadas)
    const techStats = await prisma.repair.groupBy({
      by: ["technicianId"],
      where: { ...where, status: { in: ["completed", "delivered"] }, technicianId: { not: null } },
      _count: { _all: true },
      _sum: { estimatedCost: true },
      orderBy: { _count: { technicianId: "desc" } },
      take: 5,
    });
    const techIds = techStats.map(t => t.technicianId!).filter(Boolean);
    const techs = techIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: techIds } }, select: { id: true, name: true, image: true } }) : [];
    const topTechnicians = techStats.map(t => {
      const u = techs.find(x => x.id === t.technicianId);
      return { id: t.technicianId, name: u?.name || "Sin nombre", image: u?.image || null, count: t._count._all, revenue: Number(t._sum.estimatedCost || 0) };
    });

    // Inventario bajo stock (≤ 5)
    const invWhere: any = {};
    if (branchId) invWhere.branchId = branchId;
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: { ...invWhere, quantity: { lte: 5 } },
      select: { id: true, name: true, quantity: true, price: true, image: true, branch: { select: { name: true } } },
      orderBy: { quantity: "asc" },
      take: 10,
    });

    // Consolas disponibles vs vendidas
    const cnWhere: any = {};
    if (branchId) cnWhere.branchId = branchId;
    const [cnDisp, cnVend, cnRes] = await Promise.all([
      prisma.console.count({ where: { ...cnWhere, condition: "disponible" } }),
      prisma.console.count({ where: { ...cnWhere, condition: "vendida" } }),
      prisma.console.count({ where: { ...cnWhere, condition: "reservada" } }),
    ]);

    // Cotizaciones y Notas de Venta
    const [cotCount, nvCount] = await Promise.all([
      prisma.quotation.count({ where: { ...where, type: "quotation" } }),
      prisma.quotation.count({ where: { ...where, type: "sale" } }),
    ]);

    // Ticket promedio (OTs entregadas)
    const avgTicket = byStatus.delivered ? revAll / byStatus.delivered : 0;

    // ========== TRÁFICO DEL PORTAL (PageView) ==========
    const pvWhere: any = {};
    if (branchId) pvWhere.branchId = branchId;

    // Totales de visitas (no filtramos por branch para el portal general, ya que puede no tener branchId asociado)
    const [pvToday, pvWeek, pvMonth, pvAll, pvUniqueToday, pvUniqueWeek, pvUniqueMonth] = await Promise.all([
      prisma.pageView.count({ where: { ...pvWhere, createdAt: { gte: startOfDay } } }),
      prisma.pageView.count({ where: { ...pvWhere, createdAt: { gte: startOfWeek } } }),
      prisma.pageView.count({ where: { ...pvWhere, createdAt: { gte: startOfMonth } } }),
      prisma.pageView.count({ where: pvWhere }),
      prisma.pageView.findMany({ where: { ...pvWhere, createdAt: { gte: startOfDay } }, select: { ipHash: true }, distinct: ["ipHash"] }).then(r => r.length),
      prisma.pageView.findMany({ where: { ...pvWhere, createdAt: { gte: startOfWeek } }, select: { ipHash: true }, distinct: ["ipHash"] }).then(r => r.length),
      prisma.pageView.findMany({ where: { ...pvWhere, createdAt: { gte: startOfMonth } }, select: { ipHash: true }, distinct: ["ipHash"] }).then(r => r.length),
    ]);

    // Visitas por tipo de documento (últimos 30 días)
    const last30 = new Date(now); last30.setDate(now.getDate() - 30);
    const pvByTypeRaw = await prisma.pageView.groupBy({
      by: ["documentType"],
      where: { ...pvWhere, createdAt: { gte: last30 }, documentType: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { documentType: "desc" } },
    });
    const pvByType = pvByTypeRaw.map(r => ({ type: r.documentType || "none", count: r._count._all }));

    // Top 10 documentos más consultados
    const topDocsRaw = await prisma.pageView.groupBy({
      by: ["documentCode", "documentType"],
      where: { ...pvWhere, documentCode: { not: null }, createdAt: { gte: last30 } },
      _count: { _all: true },
      orderBy: { _count: { documentCode: "desc" } },
      take: 10,
    });
    const topDocuments = topDocsRaw.map(r => ({ code: r.documentCode, type: r.documentType, count: r._count._all }));

    // Visitas por hora del día (últimos 7 días) — agrupación en SQL
    let hourlyRows: { hour: number; count: bigint }[] = [];
    try {
      if (branchId) {
        hourlyRows = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
          SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::bigint AS count
          FROM "PageView"
          WHERE "createdAt" >= ${startOfWeek} AND "branchId" = ${branchId}
          GROUP BY hour
          ORDER BY hour
        `;
      } else {
        hourlyRows = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
          SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::bigint AS count
          FROM "PageView"
          WHERE "createdAt" >= ${startOfWeek}
          GROUP BY hour
          ORDER BY hour
        `;
      }
    } catch {}
    const byHour: { hour: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const row = hourlyRows.find(r => Number(r.hour) === h);
      byHour.push({ hour: h, count: row ? Number(row.count) : 0 });
    }

    // Últimos 7 días (timeline)
    const trafficLast7Days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const count = await prisma.pageView.count({ where: { ...pvWhere, createdAt: { gte: d, lt: next } } });
      const label = d.toLocaleDateString("es-BO", { weekday: "short", day: "numeric" });
      trafficLast7Days.push({ day: label, count });
    }

    return NextResponse.json({
      revenue: {
        repairs: { today: revToday, week: revWeek, month: revMonth, year: revYear, all: revAll },
        sales: { today: nvToday, week: nvWeek, month: nvMonth, year: nvYear, all: nvAll },
        combined: {
          today: revToday + nvToday,
          week: revWeek + nvWeek,
          month: revMonth + nvMonth,
          year: revYear + nvYear,
          all: revAll + nvAll,
        },
      },
      repairs: { total: totalRepairs, byStatus, avgTicket },
      timeline: last6MonthsData,
      topTechnicians,
      inventory: { lowStock: lowStockItems },
      consoles: { disponibles: cnDisp, vendidas: cnVend, reservadas: cnRes },
      quotations: { cotizaciones: cotCount, notasVenta: nvCount },
      traffic: {
        visits: {
          today: pvToday, week: pvWeek, month: pvMonth, all: pvAll,
          uniqueToday: pvUniqueToday, uniqueWeek: pvUniqueWeek, uniqueMonth: pvUniqueMonth,
        },
        byType: pvByType,
        topDocuments,
        byHour,
        last7Days: trafficLast7Days,
      },
    });
  } catch (error: any) {
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas", details: error?.message || String(error) }, { status: 500 });
  }
}
