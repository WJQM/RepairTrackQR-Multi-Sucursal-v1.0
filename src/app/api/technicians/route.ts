import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getUserFromToken(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const branchId = getEffectiveBranchId(request, user);

  const where: any = { role: "tech" };
  if (branchId) where.branchId = branchId;

  const technicians = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, phone: true, branchId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(technicians);
}
