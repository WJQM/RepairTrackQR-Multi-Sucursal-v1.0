import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { notificationId, markAll } = await request.json();
    if (markAll) {
      await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    } else if (notificationId) {
      await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const deleted = await prisma.notification.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    return NextResponse.json({ error: "Error al limpiar" }, { status: 500 });
  }
}
