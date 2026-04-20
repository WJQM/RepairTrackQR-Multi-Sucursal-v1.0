import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    // Determinar sucursal (si no es superadmin, solo su sucursal)
    const url_branchId = url.searchParams.get("branchId");
    const branchFilter = user.role === "superadmin"
      ? (url_branchId ? { branchId: url_branchId } : {})
      : { branchId: user.branchId };

    const lq = q.toLowerCase();
    const upperQ = q.toUpperCase();

    // Búsquedas en paralelo
    const [repairs, equipment, consoles, quotations, certificates] = await Promise.all([
      // OTs: por código, cliente, teléfono, device
      prisma.repair.findMany({
        where: {
          ...branchFilter,
          OR: [
            { code: { contains: upperQ } },
            { clientName: { contains: q, mode: "insensitive" } },
            { clientPhone: { contains: q } },
            { device: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, code: true, clientName: true, device: true, brand: true, model: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Equipos: por código, nombre, marca, modelo
      prisma.equipment.findMany({
        where: {
          ...branchFilter,
          OR: [
            { code: { contains: upperQ } },
            { id: { contains: upperQ } },
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { processor: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, code: true, name: true, brand: true, model: true, condition: true, price: true },
        take: 5,
      }),
      // Consolas: por código, nombre, marca
      prisma.console.findMany({
        where: {
          ...branchFilter,
          OR: [
            { code: { contains: upperQ } },
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, code: true, name: true, brand: true, model: true, condition: true, price: true },
        take: 5,
      }),
      // Cotizaciones/Notas de venta: por código, clientName
      prisma.quotation.findMany({
        where: {
          ...branchFilter,
          OR: [
            { code: { contains: upperQ } },
            { clientName: { contains: q, mode: "insensitive" } },
            { clientPhone: { contains: q } },
          ],
        },
        select: { id: true, code: true, clientName: true, type: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Certificados
      prisma.certificate.findMany({
        where: {
          ...branchFilter,
          OR: [
            { code: { contains: upperQ } },
            { clientName: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, code: true, clientName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Formatear resultados con type uniforme
    const results = [
      ...repairs.map((r: any) => ({
        type: "repair",
        id: r.id,
        code: r.code,
        title: `${r.device}${r.brand ? " " + r.brand : ""}${r.model ? " " + r.model : ""}`,
        subtitle: r.clientName || "Sin cliente",
        meta: r.status,
        url: user.role === "tech" ? `/asignaciones?focus=${r.code}` : `/dashboard?focus=${r.code}`,
      })),
      ...equipment.map((e: any) => ({
        type: "equipment",
        id: e.id,
        code: e.code || `EQ-${e.id.slice(-6).toUpperCase()}`,
        title: `${e.name}${e.brand ? " — " + e.brand : ""}${e.model ? " " + e.model : ""}`,
        subtitle: `Bs. ${e.price || 0}`,
        meta: e.condition,
        url: `/equipment/print/${e.id}`,
      })),
      ...consoles.map((c: any) => ({
        type: "console",
        id: c.id,
        code: c.code || `CN-?`,
        title: `${c.name}${c.brand ? " — " + c.brand : ""}${c.model ? " " + c.model : ""}`,
        subtitle: `Bs. ${c.price || 0}`,
        meta: c.condition,
        url: `/consoles/print/${c.id}`,
      })),
      ...quotations.map((q: any) => ({
        type: q.type === "sale" ? "sale" : "quotation",
        id: q.id,
        code: q.code,
        title: q.clientName || "Sin cliente",
        subtitle: `Bs. ${q.total || 0}`,
        meta: null,
        url: `/quotations/print/${q.id}`,
      })),
      ...certificates.map((c: any) => ({
        type: "certificate",
        id: c.id,
        code: c.code,
        title: c.clientName || "Sin cliente",
        subtitle: null,
        meta: null,
        url: `/certificate-view/${c.code}`,
      })),
    ];

    return NextResponse.json({ results, total: results.length });
  } catch (error: any) {
    console.error("[Search] Error:", error);
    return NextResponse.json({ error: "Error en búsqueda", details: error?.message }, { status: 500 });
  }
}
