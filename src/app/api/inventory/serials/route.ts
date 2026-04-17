import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";

// GET /api/inventory/serials?inventoryId=xxx
export async function GET(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const inventoryId = searchParams.get("inventoryId");
  if (!inventoryId) return NextResponse.json({ error: "inventoryId requerido" }, { status: 400 });
  try {
    const serials = await prisma.serialUnit.findMany({
      where: { inventoryItemId: inventoryId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(serials);
  } catch { return NextResponse.json([], { status: 500 }); }
}

// POST — add one or many serials
export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { inventoryItemId, serials } = await req.json();
    // serials = [{ serialNumber, notes? }]
    if (!inventoryItemId || !Array.isArray(serials) || serials.length === 0)
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const created = await Promise.all(
      serials.map((s: { serialNumber: string; notes?: string }) =>
        prisma.serialUnit.create({
          data: { serialNumber: s.serialNumber.trim(), notes: s.notes || null, inventoryItemId, status: "available" },
        })
      )
    );
    // Update item quantity to match available serials count
    const available = await prisma.serialUnit.count({ where: { inventoryItemId, status: "available" } });
    await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantity: available } });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Número de serie duplicado" }, { status: 409 });
    return NextResponse.json({ error: "Error al crear serial" }, { status: 500 });
  }
}

// PATCH — mark as sold or restore
export async function PATCH(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id, status, soldTo, saleCode } = await req.json();
    const serial = await prisma.serialUnit.update({
      where: { id },
      data: {
        status,
        soldTo: status === "sold" ? soldTo || null : null,
        soldAt: status === "sold" ? new Date() : null,
        repairCode: status === "sold" ? saleCode || null : null,
      },
    });
    // Sync quantity
    const inventoryItemId = serial.inventoryItemId;
    const available = await prisma.serialUnit.count({ where: { inventoryItemId, status: "available" } });
    await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantity: available } });
    return NextResponse.json(serial);
  } catch { return NextResponse.json({ error: "Error al actualizar serial" }, { status: 500 }); }
}

// DELETE — remove serial (only if available)
export async function DELETE(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await req.json();
    const serial = await prisma.serialUnit.findUnique({ where: { id } });
    if (!serial) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (serial.status === "sold") return NextResponse.json({ error: "No se puede eliminar un serial vendido" }, { status: 400 });
    await prisma.serialUnit.delete({ where: { id } });
    const available = await prisma.serialUnit.count({ where: { inventoryItemId: serial.inventoryItemId, status: "available" } });
    await prisma.inventoryItem.update({ where: { id: serial.inventoryItemId }, data: { quantity: available } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar serial" }, { status: 500 }); }
}
