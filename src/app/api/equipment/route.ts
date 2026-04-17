import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

function buildName(type: string, brand?: string | null, model?: string | null, cabinet?: string | null): string {
  if (type === "desktop") {
    // PC de escritorio: nombre basado en el gabinete
    const cab = (cabinet || "").trim();
    return cab ? `PC Escritorio ${cab}` : "PC Escritorio";
  }
  // Laptop: nombre basado en marca + modelo
  const parts = ["Laptop", brand, model].filter(Boolean);
  return parts.join(" ") || "Laptop";
}

async function generateEqCode(branchId: string): Promise<string> {
  const result = await prisma.$queryRaw<{ max_num: number }[]>`
    SELECT COALESCE(MAX(CAST(REPLACE(code, 'EQ-', '') AS INTEGER)), 0) as max_num
    FROM "Equipment"
    WHERE "branchId" = ${branchId} AND code ~ '^EQ-[0-9]+$'
  `;
  return `EQ-${(result[0]?.max_num || 0) + 1}`;
}

export async function GET(req: Request) {
  const user = getUserFromToken(req);
  const branchId = user ? getEffectiveBranchId(req, user) : null;
  try {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    const items = await prisma.equipment.findMany({ where, include: { branch: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
  } catch { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const branchId = getEffectiveBranchId(req, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });
  try {
    const { type, brand, model, processor, ram, storage, storage2, screenSize, graphicsCard, os, cabinet, powerSupply, motherboard, accessories, condition, price, notes, image } = await req.json();
    const name = buildName(type, brand, model, cabinet);
    const code = await generateEqCode(branchId);
    const item = await prisma.equipment.create({
      data: {
        code, name, type: type || "laptop", brand: brand || null, model: model || null,
        processor: processor || null, ram: ram || null, storage: storage || null,
        storage2: storage2 || null, screenSize: screenSize || null, graphicsCard: graphicsCard || null,
        os: os || null, cabinet: cabinet || null, powerSupply: powerSupply || null,
        motherboard: motherboard || null, accessories: accessories || null,
        condition: condition || "disponible", price: parseFloat(price) || 0,
        notes: notes || null, image: image || null, branchId,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message || "Error al crear equipo" }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id, type, brand, model, processor, ram, storage, storage2, screenSize, graphicsCard, os, cabinet, powerSupply, motherboard, accessories, condition, price, notes, image } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const existing = await prisma.equipment.findUnique({ where: { id } });
    const finalType = type !== undefined ? type : existing?.type || "laptop";
    const finalBrand = brand !== undefined ? brand : existing?.brand;
    const finalModel = model !== undefined ? model : existing?.model;
    const finalCabinet = cabinet !== undefined ? cabinet : existing?.cabinet;
    const name = buildName(finalType, finalBrand, finalModel, finalCabinet);
    const item = await prisma.equipment.update({
      where: { id },
      data: {
        name,
        ...(type !== undefined && { type }), ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }), ...(processor !== undefined && { processor }),
        ...(ram !== undefined && { ram }), ...(storage !== undefined && { storage }),
        ...(storage2 !== undefined && { storage2 }), ...(screenSize !== undefined && { screenSize }),
        ...(graphicsCard !== undefined && { graphicsCard }), ...(os !== undefined && { os }),
        ...(cabinet !== undefined && { cabinet }), ...(powerSupply !== undefined && { powerSupply }),
        ...(motherboard !== undefined && { motherboard }), ...(accessories !== undefined && { accessories }),
        ...(condition !== undefined && { condition }),
        ...(price !== undefined && { price: parseFloat(price) }), ...(notes !== undefined && { notes }),
        ...(image !== undefined && { image }),
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
    await prisma.equipment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Error al eliminar" }, { status: 500 }); }
}
