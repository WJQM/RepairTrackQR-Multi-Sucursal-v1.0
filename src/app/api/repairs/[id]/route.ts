import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", diagnosed: "Diagnosticado", waiting_parts: "Esperando Repuestos",
  in_progress: "En Progreso", completed: "Completado", delivered: "Entregado",
};

export async function PATCH(request: Request, context: any) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await request.json();

    if (user.role === "tech") {
      const repair = await prisma.repair.findUnique({ where: { id } });
      if (!repair || repair.technicianId !== user.id) {
        return NextResponse.json({ error: "No tienes permiso para modificar esta orden" }, { status: 403 });
      }
      const updateData: Record<string, any> = {};
      if (body.status !== undefined) updateData.status = body.status;
      if (body.notes !== undefined) updateData.notes = body.notes || null;

      const updated = await prisma.repair.update({ where: { id }, data: updateData });

      if (body.status) {
        await prisma.notification.create({
          data: {
            type: "status_change",
            title: "Estado actualizado por técnico",
            message: `${updated.code} (${updated.device}) cambió a "${STATUS_LABELS[body.status] || body.status}"`,
            userId: updated.userId,
            branchId: updated.branchId,
          },
        });
      }

      return NextResponse.json(updated);
    }

    // Admin / superadmin can change everything
    const updateData: Record<string, any> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.device !== undefined) updateData.device = body.device;
    if (body.brand !== undefined) updateData.brand = body.brand || null;
    if (body.model !== undefined) updateData.model = body.model || null;
    if (body.issue !== undefined) updateData.issue = body.issue;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.estimatedCost !== undefined) updateData.estimatedCost = body.estimatedCost;
    if (body.clientName !== undefined) updateData.clientName = body.clientName || null;
    if (body.clientPhone !== undefined) updateData.clientPhone = body.clientPhone || null;
    if (body.clientEmail !== undefined) updateData.clientEmail = body.clientEmail || null;
    if (body.image !== undefined) updateData.image = body.image || null;
    if (body.accessories !== undefined) updateData.accessories = body.accessories || null;
    if (body.technicianId !== undefined) updateData.technicianId = body.technicianId || null;

    const repair = await prisma.repair.update({ where: { id }, data: updateData });

    if (body.status) {
      await prisma.notification.create({
        data: {
          type: "status_change",
          title: "Estado actualizado",
          message: `${repair.code} (${repair.device}) cambió a "${STATUS_LABELS[body.status] || body.status}"`,
          userId: user.id,
          branchId: repair.branchId,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          type: "status_change",
          title: "Orden editada",
          message: `${repair.code} (${repair.device}) fue modificada`,
          userId: user.id,
          branchId: repair.branchId,
        },
      });
    }

    if (body.technicianId && body.technicianId !== repair.technicianId) {
      await prisma.notification.create({
        data: {
          type: "new_repair",
          title: "Nueva asignación",
          message: `Se te asignó ${repair.code} - ${repair.device}`,
          userId: body.technicianId,
          branchId: repair.branchId,
        },
      });
    }

    return NextResponse.json(repair);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (user.role === "tech") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar órdenes" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const repair = await prisma.repair.delete({ where: { id } });

    await prisma.notification.create({
      data: {
        type: "status_change",
        title: "Orden eliminada",
        message: `${repair.code} (${repair.device}) fue eliminada`,
        userId: user.id,
        branchId: repair.branchId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
