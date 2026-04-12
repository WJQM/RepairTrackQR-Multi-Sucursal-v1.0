import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

async function generateCode(branchId: string): Promise<string> {
  const lastRepair = await prisma.repair.findFirst({
    where: { branchId, code: { startsWith: "OT-" } },
    orderBy: { createdAt: "desc" },
  });

  let nextNum = 1;
  if (lastRepair) {
    const match = lastRepair.code.match(/^OT-(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  // Verify uniqueness within branch
  const exists = await prisma.repair.findFirst({ where: { code: `OT-${nextNum}`, branchId } });
  if (exists) nextNum = nextNum + 1;

  return `OT-${nextNum}`;
}

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branchId = getEffectiveBranchId(request, user);

  const where: any = {};

  // Tech only sees assigned repairs
  if (user.role === "tech") {
    where.technicianId = user.id;
    where.branchId = user.branchId;
  } else if (branchId) {
    where.branchId = branchId;
  }
  // superadmin without x-branch-id sees all

  const repairs = await prisma.repair.findMany({
    where,
    include: {
      technician: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(repairs);
}

export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();

    // Determine branch
    const branchId = getEffectiveBranchId(request, user) || body.branchId;
    if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });

    const code = await generateCode(branchId);

    const repair = await prisma.repair.create({
      data: {
        code,
        device: body.device || "",
        brand: body.brand || null,
        model: body.model || null,
        issue: body.issue || "",
        priority: "media",
        estimatedCost: body.estimatedCost || 0,
        notes: body.notes || null,
        image: body.image || null,
        accessories: body.accessories || null,
        clientName: body.clientName || null,
        clientPhone: body.clientPhone || null,
        clientEmail: body.clientEmail || null,
        qrCode: code,
        userId: user.id,
        branchId,
        technicianId: body.technicianId || null,
      },
    });

    await prisma.notification.create({
      data: {
        type: "new_repair",
        title: "Nueva orden creada",
        message: `${repair.code} - ${repair.device} (${body.clientName || "Sin nombre"})`,
        userId: user.id,
        branchId,
      },
    });

    if (body.technicianId) {
      await prisma.notification.create({
        data: {
          type: "new_repair",
          title: "Nueva asignación",
          message: `Se te asignó ${repair.code} - ${repair.device} (${body.clientName || "Sin nombre"})`,
          userId: body.technicianId,
          branchId,
        },
      });
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
