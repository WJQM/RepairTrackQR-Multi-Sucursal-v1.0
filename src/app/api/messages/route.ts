import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const repairId = searchParams.get("repairId");
  if (!repairId) return NextResponse.json({ error: "repairId es requerido" }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: { repairId },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { repairId, text } = await request.json();
    if (!repairId || !text) return NextResponse.json({ error: "repairId y text son requeridos" }, { status: 400 });

    // Get repair to find branchId
    const repair = await prisma.repair.findUnique({ where: { id: repairId } });
    if (!repair) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    const message = await prisma.message.create({
      data: { text, repairId, userId: user.id, branchId: repair.branchId },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
