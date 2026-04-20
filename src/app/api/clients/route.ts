import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

// GET /api/clients — agrega clientes únicos desde repairs + quotations
// ?q=texto para buscar, ?phone=xxx para un cliente específico (autocomplete)
export async function GET(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.role === "tech") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const branchId = getEffectiveBranchId(request, user);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const phoneFilter = (url.searchParams.get("phone") || "").trim();

    const where: any = {};
    if (branchId) where.branchId = branchId;

    // Traer OTs y cotizaciones con datos de cliente
    const [repairs, quotations] = await Promise.all([
      prisma.repair.findMany({
        where: { ...where, clientPhone: { not: null } },
        select: {
          clientName: true, clientPhone: true, clientEmail: true,
          code: true, status: true, estimatedCost: true, createdAt: true, device: true,
        },
      }),
      prisma.quotation.findMany({
        where: { ...where, clientPhone: { not: null } },
        select: {
          clientName: true, clientPhone: true,
          code: true, type: true, total: true, createdAt: true,
        },
      }),
    ]);

    // Agrupar por teléfono (normalizado)
    const normalize = (p: string) => (p || "").replace(/\D/g, "").slice(-8);
    const clientsMap: Record<string, any> = {};

    for (const r of repairs) {
      const key = normalize(r.clientPhone || "");
      if (!key) continue;
      if (!clientsMap[key]) {
        clientsMap[key] = {
          phone: r.clientPhone, name: r.clientName || "Sin nombre", email: r.clientEmail,
          totalRepairs: 0, totalSpent: 0, totalQuotations: 0, totalSales: 0,
          lastActivity: r.createdAt, firstActivity: r.createdAt,
          repairs: [], quotations: [],
        };
      }
      clientsMap[key].totalRepairs++;
      if (r.status === "delivered") clientsMap[key].totalSpent += Number(r.estimatedCost) || 0;
      if (new Date(r.createdAt) > new Date(clientsMap[key].lastActivity)) clientsMap[key].lastActivity = r.createdAt;
      if (new Date(r.createdAt) < new Date(clientsMap[key].firstActivity)) clientsMap[key].firstActivity = r.createdAt;
      if (clientsMap[key].repairs.length < 10) clientsMap[key].repairs.push({ code: r.code, device: r.device, status: r.status, createdAt: r.createdAt, cost: r.estimatedCost });
      // Preferir el nombre más reciente si no era "Sin nombre"
      if (r.clientName && (clientsMap[key].name === "Sin nombre" || new Date(r.createdAt) > new Date(clientsMap[key].lastActivity))) {
        clientsMap[key].name = r.clientName;
      }
      if (r.clientEmail && !clientsMap[key].email) clientsMap[key].email = r.clientEmail;
    }

    for (const q of quotations) {
      const key = normalize(q.clientPhone || "");
      if (!key) continue;
      if (!clientsMap[key]) {
        clientsMap[key] = {
          phone: q.clientPhone, name: q.clientName || "Sin nombre", email: null,
          totalRepairs: 0, totalSpent: 0, totalQuotations: 0, totalSales: 0,
          lastActivity: q.createdAt, firstActivity: q.createdAt,
          repairs: [], quotations: [],
        };
      }
      if (q.type === "sale") {
        clientsMap[key].totalSales++;
        clientsMap[key].totalSpent += Number(q.total) || 0;
      } else {
        clientsMap[key].totalQuotations++;
      }
      if (new Date(q.createdAt) > new Date(clientsMap[key].lastActivity)) clientsMap[key].lastActivity = q.createdAt;
      if (new Date(q.createdAt) < new Date(clientsMap[key].firstActivity)) clientsMap[key].firstActivity = q.createdAt;
      if (clientsMap[key].quotations.length < 10) clientsMap[key].quotations.push({ code: q.code, type: q.type, total: q.total, createdAt: q.createdAt });
    }

    // Array ordenado por totalSpent descendente
    let clients = Object.entries(clientsMap).map(([phoneKey, v]) => ({ phoneKey, ...v }));

    // Filtros
    if (phoneFilter) {
      const pk = normalize(phoneFilter);
      clients = clients.filter(c => c.phoneKey === pk);
    }
    if (q) {
      clients = clients.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    }

    clients.sort((a, b) => b.totalSpent - a.totalSpent || b.totalRepairs - a.totalRepairs);

    return NextResponse.json({ clients, total: clients.length });
  } catch (error: any) {
    console.error("[Clients] Error:", error);
    return NextResponse.json({ error: "Error al cargar clientes", details: error?.message }, { status: 500 });
  }
}
