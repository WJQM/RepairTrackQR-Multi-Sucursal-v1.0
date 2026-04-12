import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

const SETTINGS_ID = "global";

// GET - Public (login page needs it too)
export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });

    // Auto-create default settings if not found
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: SETTINGS_ID,
          companyName: "RepairTrackQR",
          slogan: "Servicio Técnico Especializado",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({
      id: SETTINGS_ID,
      companyName: "RepairTrackQR",
      slogan: "Servicio Técnico Especializado",
      logo: null, phone: null, email: null, address: null, website: null,
    });
  }
}

// PUT - Superadmin only
export async function PUT(request: Request) {
  try {
    const user = requireAuth(request);

    if (user.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el Super Admin puede modificar la configuración" }, { status: 403 });
    }

    const body = await request.json();
    const { companyName, slogan, logo, phone, email, address, website } = body;

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(slogan !== undefined && { slogan }),
        ...(logo !== undefined && { logo }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
      },
      create: {
        id: SETTINGS_ID,
        companyName: companyName || "RepairTrackQR",
        slogan: slogan || "Servicio Técnico Especializado",
        logo, phone, email, address, website,
      },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    if (error?.message === "NO_AUTH") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
