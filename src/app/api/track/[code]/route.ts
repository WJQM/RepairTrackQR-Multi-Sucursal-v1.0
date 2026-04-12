import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: any) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    // If branchId specified, find exact match
    if (branchId) {
      const repair = await prisma.repair.findFirst({
        where: {
          branchId,
          OR: [{ code }, { qrCode: code }],
        },
        include: { branch: { select: { id: true, name: true } } },
      });
      if (!repair) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
      return NextResponse.json(repair);
    }

    // Find in all branches
    const repairs = await prisma.repair.findMany({
      where: {
        OR: [{ code }, { qrCode: code }],
      },
      include: { branch: { select: { id: true, name: true } } },
    });

    if (repairs.length === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // If only one match, return directly
    if (repairs.length === 1) return NextResponse.json(repairs[0]);

    // Multiple matches - return array so client can choose branch
    return NextResponse.json({ multiple: true, repairs });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
