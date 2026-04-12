import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, phone, branchId, image } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nombre, correo y contraseña son requeridos" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
    }

    if ((role === "admin" || role === "tech") && !branchId) {
      return NextResponse.json({ error: "Se requiere una sucursal para admin/técnico" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const data: any = {
      name,
      email,
      password: hashedPassword,
      role: role || "admin",
      phone: phone || null,
      status: role === "superadmin" ? "active" : "pending",
    };

    // Only set branchId for non-superadmin
    if (role !== "superadmin" && branchId) {
      data.branchId = branchId;
    }

    // Only set image if provided
    if (image) {
      data.image = image;
    }

    const user = await prisma.user.create({ data });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });
  } catch (error: any) {
    console.error("Register error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Error al registrar usuario" }, { status: 500 });
  }
}
