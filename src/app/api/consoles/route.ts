import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  const branchId = user ? getEffectiveBranchId(req, user) : null;
  try {
    const where: any = { active: true };
    if (branchId) where.branchId = branchId;
    const items = await prisma.console.findMany({
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
    const { name, category, state, brand, model, color, storage, generation, accessories, condition, price, notes, image } = await req.json();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    // Generar código CN-N secuencial por sucursal
    const existingConsoles = await prisma.console.findMany({
      where: { branchId },
      select: { code: true },
    });
    const usedNumbers = existingConsoles
      .map(c => c.code)
      .filter(c => /^CN-\d+$/.test(c))
      .map(c => parseInt(c.replace("CN-", ""), 10))
      .filter(n => !isNaN(n));
    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
    const code = `CN-${nextNumber}`;

    const item = await prisma.console.create({
      data: {
        code,
        name,
        category: category || null,
        state: state || null,
        brand: brand || null,
        model: model || null,
        color: color || null,
        storage: storage || null,
        generation: generation || null,
        accessories: accessories || null,
        condition: condition || "disponible",
        price: typeof price === "number" ? price : parseFloat(price) || 0,
        notes: notes || null,
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
    const { id, name, category, state, brand, model, color, storage, generation, accessories, condition, price, notes, image, active } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const item = await prisma.console.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(state !== undefined && { state }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(color !== undefined && { color }),
        ...(storage !== undefined && { storage }),
        ...(generation !== undefined && { generation }),
        ...(accessories !== undefined && { accessories }),
        ...(condition !== undefined && { condition }),
        ...(price !== undefined && { price: typeof price === "number" ? price : parseFloat(price) || 0 }),
        ...(notes !== undefined && { notes }),
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
    await prisma.console.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar" }, { status: 500 }); }
}
