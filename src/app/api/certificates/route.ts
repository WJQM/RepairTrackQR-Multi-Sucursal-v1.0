import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

// GET - List certificates for the current branch, or search by code across branches
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const qBranchId = searchParams.get("branchId");

  // Search by code (used by scanner/search)
  if (code) {
    if (qBranchId) {
      const cert = await prisma.certificate.findFirst({
        where: { code, branchId: qBranchId },
        include: { user: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
      });
      if (!cert) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json(cert);
    }
    // Search across all branches
    const certs = await prisma.certificate.findMany({
      where: { code },
      include: { user: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } } },
    });
    if (certs.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (certs.length === 1) return NextResponse.json(certs[0]);
    // Multiple matches across branches
    return NextResponse.json({ multiple: true, certificates: certs });
  }

  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branchId = getEffectiveBranchId(request, user);
  const where: any = {};
  if (branchId) where.branchId = branchId;

  try {
    const certificates = await prisma.certificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(certificates);
  } catch (error: any) {
    console.error("Certificates GET error:", error);
    return NextResponse.json({ error: "Error al obtener certificados" }, { status: 500 });
  }
}

// POST - Create a new certificate
export async function POST(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branchId = getEffectiveBranchId(request, user);
  if (!branchId) return NextResponse.json({ error: "Se requiere sucursal" }, { status: 400 });

  try {
    const body = await request.json();
    const {
      clientName,
      computerName,
      windowsEdition,
      windowsSerial,
      officeEdition,
      officeSerial,
      date,
      technician,
      notes,
    } = body;

    if (!clientName) return NextResponse.json({ error: "El nombre del cliente es obligatorio" }, { status: 400 });
    if (!windowsSerial && !officeSerial) return NextResponse.json({ error: "Se requiere al menos una clave de producto" }, { status: 400 });

    // Generate auto-incremental code per branch: CL-1, CL-2, etc.
    const result = await prisma.$queryRaw<{max_num: number}[]>`
      SELECT COALESCE(MAX(CAST(REPLACE(code, 'CL-', '') AS INTEGER)), 0) as max_num
      FROM "Certificate"
      WHERE "branchId" = ${branchId} AND code ~ '^CL-[0-9]+$'
    `;
    const code = `CL-${(result[0]?.max_num || 0) + 1}`;

    const certificate = await prisma.certificate.create({
      data: {
        code,
        clientName,
        computerName: computerName || null,
        windowsEdition: windowsSerial ? (windowsEdition || null) : null,
        windowsSerial: windowsSerial || null,
        officeEdition: officeSerial ? (officeEdition || null) : null,
        officeSerial: officeSerial || null,
        date: date || new Date().toISOString().split("T")[0],
        technician: technician || "",
        notes: notes || null,
        branchId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error: any) {
    console.error("Certificates POST error:", error);
    return NextResponse.json({ error: error.message || "Error al crear certificado" }, { status: 500 });
  }
}

// PATCH - Update a certificate
export async function PATCH(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...updateFields } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updateData: any = {};
    if (updateFields.clientName !== undefined) updateData.clientName = updateFields.clientName;
    if (updateFields.computerName !== undefined) updateData.computerName = updateFields.computerName || null;
    if (updateFields.windowsEdition !== undefined) updateData.windowsEdition = updateFields.windowsEdition || null;
    if (updateFields.windowsSerial !== undefined) updateData.windowsSerial = updateFields.windowsSerial || null;
    if (updateFields.officeEdition !== undefined) updateData.officeEdition = updateFields.officeEdition || null;
    if (updateFields.officeSerial !== undefined) updateData.officeSerial = updateFields.officeSerial || null;
    if (updateFields.date !== undefined) updateData.date = updateFields.date;
    if (updateFields.technician !== undefined) updateData.technician = updateFields.technician;
    if (updateFields.notes !== undefined) updateData.notes = updateFields.notes || null;

    const certificate = await prisma.certificate.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(certificate);
  } catch (error: any) {
    console.error("Certificates PATCH error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

// DELETE - Delete a certificate
export async function DELETE(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.certificate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Certificates DELETE error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar" }, { status: 500 });
  }
}
