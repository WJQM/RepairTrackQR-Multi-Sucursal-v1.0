import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);

  try {
    // Public access: return only names for register form
    if (!user) {
      const branches = await prisma.branch.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(branches);
    }

    // Authenticated: return full details
    const branches = await prisma.branch.findMany({
      where: { active: true },
      include: { _count: { select: { users: true, repairs: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { name, address, phone } = await request.json();
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const branch = await prisma.branch.create({
      data: { name, address: address || null, phone: phone || null },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear sucursal" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { id, name, address, phone, active } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(active !== undefined && { active }),
      },
    });
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { id } = await request.json();
    await prisma.branch.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
