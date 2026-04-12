import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  const branchId = user ? getEffectiveBranchId(req, user) : null;
  try {
    const where: any = { active: true };
    if (branchId) where.branchId = branchId;
    const services = await prisma.service.findMany({ where, orderBy: { createdAt: "asc" } });
    return NextResponse.json(services);
  } catch { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(req, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });
  try {
    const { name, price, icon } = await req.json();
    if (!name || price === undefined) return NextResponse.json({ error: "Nombre y precio requeridos" }, { status: 400 });
    const service = await prisma.service.create({ data: { name, price: parseFloat(price), icon: icon || "🔧", branchId } });
    return NextResponse.json(service, { status: 201 });
  } catch { return NextResponse.json({ error: "Error al crear servicio" }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id, name, price, icon, active } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const service = await prisma.service.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(price !== undefined && { price: parseFloat(price) }), ...(icon !== undefined && { icon }), ...(active !== undefined && { active }) },
    });
    return NextResponse.json(service);
  } catch { return NextResponse.json({ error: "Error al actualizar" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await req.json();
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar" }, { status: 500 }); }
}
