import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, phone: true, image: true, branchId: true, createdAt: true, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { name, email, password, role, phone, branchId, image } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });

    if ((role === "admin" || role === "tech") && !branchId) {
      return NextResponse.json({ error: "Admin/técnico requiere sucursal" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || "admin", phone: phone || null, image: image || null, status: "active", branchId: role === "superadmin" ? null : branchId },
      include: { branch: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, branchId: newUser.branchId, branch: newUser.branch }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error al crear usuario" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { id, name, email, password, role, phone, branchId, image, status } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (phone !== undefined) data.phone = phone;
    if (image !== undefined) data.image = image;
    if (branchId !== undefined) data.branchId = role === "superadmin" ? null : branchId;
    if (status !== undefined) data.status = status;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { branch: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, branchId: updated.branchId, branch: updated.branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = getUserFromToken(request);
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  try {
    const { id } = await request.json();
    if (id === user.id) return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });

    // Get the user to delete
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Find another user in the same branch to inherit data
    let inheritId = user.id; // fallback: superadmin
    if (targetUser.branchId) {
      const branchAdmin = await prisma.user.findFirst({
        where: { branchId: targetUser.branchId, id: { not: id }, role: { in: ["admin", "superadmin"] }, status: "active" },
        orderBy: { createdAt: "asc" },
      });
      if (branchAdmin) inheritId = branchAdmin.id;
    }

    // Delete related records / transfer ownership
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.quotation.updateMany({ where: { userId: id }, data: { userId: inheritId } });
    await prisma.repair.updateMany({ where: { technicianId: id }, data: { technicianId: null } });
    await prisma.repair.updateMany({ where: { userId: id }, data: { userId: inheritId } });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
