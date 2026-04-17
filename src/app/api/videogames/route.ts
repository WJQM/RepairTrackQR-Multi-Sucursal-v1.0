import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  const branchId = user ? getEffectiveBranchId(req, user) : null;
  try {
    const where: any = { active: true };
    if (branchId) where.branchId = branchId;
    const items = await prisma.videogame.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(req, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });
  try {
    const { name, platform, genre, description, size, minRequirements, recRequirements, language, rating, image } = await req.json();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const item = await prisma.videogame.create({
      data: {
        name,
        platform: platform || null,
        genre: genre || null,
        description: description || null,
        size: size || null,
        minRequirements: minRequirements || null,
        recRequirements: recRequirements || null,
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
    const { id, name, platform, genre, description, size, minRequirements, recRequirements, language, rating, image, active } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const item = await prisma.videogame.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(platform !== undefined && { platform }),
        ...(genre !== undefined && { genre }),
        ...(description !== undefined && { description }),
        ...(size !== undefined && { size }),
        ...(minRequirements !== undefined && { minRequirements }),
        ...(recRequirements !== undefined && { recRequirements }),
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
    await prisma.videogame.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar" }, { status: 500 }); }
}
