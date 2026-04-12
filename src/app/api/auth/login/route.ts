import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "repairtrack-secret-key-2026";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }

    // Block superadmin from normal login (only allow from /setup)
    if (user.role === "superadmin" && request.headers.get("x-from") !== "setup") {
      return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }

    // Check account status
    if (user.status === "pending") {
      return NextResponse.json({ error: "Tu cuenta está pendiente de aprobación. Contacta al administrador." }, { status: 403 });
    }
    if (user.status === "suspended") {
      return NextResponse.json({ error: "Tu cuenta ha sido suspendida. Contacta al administrador." }, { status: 403 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
        image: user.image || null,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
