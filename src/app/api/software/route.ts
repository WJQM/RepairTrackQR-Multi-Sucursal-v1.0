import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  const branchId = user ? getEffectiveBranchId(req, user) : null;
  try {
    const where: any = { active: true };
    if (branchId) where.branchId = branchId;
    const items = await prisma.software.findMany({ where, include: { branch: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
  } catch { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(req, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });
  try {
    const { name, category, minRequirements, recRequirements, size, description, language, rating, image } = await req.json();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const item = await prisma.software.create({
      data: {
        name,
        category: category || null,
        minRequirements: minRequirements || null,
        recRequirements: recRequirements || null,
        size: size || null,
        description: description || null,
        language: language || null,
        rating: rating || null,
        image: image || null,
        branchId,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch { return NextResponse.json({ error: "Error al crear" }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id, name, category, minRequirements, recRequirements, size, description, language, rating, image, active } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const item = await prisma.software.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(minRequirements !== undefined && { minRequirements }),
        ...(recRequirements !== undefined && { recRequirements }),
        ...(size !== undefined && { size }),
        ...(description !== undefined && { description }),
        ...(language !== undefined && { language }),
        ...(rating !== undefined && { rating }),
        ...(image !== undefined && { image }),
        ...(active !== undefined && { active }),
      },
    });
    return NextResponse.json(item);
  } catch { return NextResponse.json({ error: "Error al actualizar" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await req.json();
    await prisma.software.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar" }, { status: 500 }); }
}
