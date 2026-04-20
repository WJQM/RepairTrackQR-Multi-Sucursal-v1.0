import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/reviews?repairCode=OT-5 — verificar si existe reseña / listar
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const repairCode = url.searchParams.get("repairCode");

    if (repairCode) {
      const existing = await prisma.review.findFirst({
        where: { repairCode: repairCode.toUpperCase() },
      });
      return NextResponse.json({ review: existing });
    }

    // Sin filtro: listar últimas (requiere auth en uso real, público solo por repairCode)
    return NextResponse.json({ review: null });
  } catch (error: any) {
    return NextResponse.json({ error: "Error", details: error?.message }, { status: 500 });
  }
}

// POST /api/reviews — crear reseña (público, solo requiere repairCode)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.repairCode || "").trim().toUpperCase();
    const rating = parseInt(String(body.rating || 0));
    const comment = body.comment ? String(body.comment).trim().substring(0, 500) : null;

    if (!code || !code.startsWith("OT-")) {
      return NextResponse.json({ error: "Código de OT inválido" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Calificación debe ser entre 1 y 5" }, { status: 400 });
    }

    // Buscar OT para asociar branchId + verificar que esté entregada
    const repair = await prisma.repair.findFirst({
      where: { code, status: "delivered" },
      select: { id: true, branchId: true, clientName: true, status: true },
    });
    if (!repair) {
      return NextResponse.json({ error: "OT no encontrada o aún no entregada" }, { status: 404 });
    }

    // Ver si ya tiene reseña
    const existing = await prisma.review.findUnique({ where: { repairId: repair.id } });
    if (existing) {
      return NextResponse.json({ error: "Esta orden ya fue calificada. ¡Gracias!", alreadyReviewed: true }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        repairId: repair.id,
        repairCode: code,
        rating,
        comment,
        clientName: repair.clientName,
        branchId: repair.branchId,
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (error: any) {
    console.error("[Review] POST Error:", error);
    return NextResponse.json({ error: "Error al guardar reseña", details: error?.message }, { status: 500 });
  }
}
