import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken, getEffectiveBranchId } from "@/lib/auth";

// GET /api/cash — listar movimientos con filtros opcionales ?from=&to=&type=&category=
export async function GET(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.role === "tech") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const branchId = getEffectiveBranchId(request, user);
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const type = url.searchParams.get("type");
    const category = url.searchParams.get("category");

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;
    if (category) where.category = category;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1); // incluye el día completo
        where.createdAt.lt = toDate;
      }
    }

    const movements = await prisma.cashMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Resumen (ingresos, egresos, saldo) — del filtro aplicado
    const totalIncome = movements.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0);
    const totalExpense = movements.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0);
    const balance = totalIncome - totalExpense;

    // Resúmenes hoy / mes
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const branchWhere = branchId ? { branchId } : {};
    const [todayMov, monthMov] = await Promise.all([
      prisma.cashMovement.findMany({ where: { ...branchWhere, createdAt: { gte: startOfDay } }, select: { type: true, amount: true } }),
      prisma.cashMovement.findMany({ where: { ...branchWhere, createdAt: { gte: startOfMonth } }, select: { type: true, amount: true } }),
    ]);
    const today = {
      income: todayMov.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0),
      expense: todayMov.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0),
    };
    const month = {
      income: monthMov.filter(m => m.type === "income").reduce((s, m) => s + m.amount, 0),
      expense: monthMov.filter(m => m.type === "expense").reduce((s, m) => s + m.amount, 0),
    };

    return NextResponse.json({
      movements,
      summary: { totalIncome, totalExpense, balance },
      today: { ...today, balance: today.income - today.expense },
      month: { ...month, balance: month.income - month.expense },
    });
  } catch (error: any) {
    console.error("[Cash] GET Error:", error);
    return NextResponse.json({ error: "Error al cargar movimientos", details: error?.message }, { status: 500 });
  }
}

// POST /api/cash — crear movimiento
export async function POST(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.role === "tech") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const body = await request.json();
    if (!body.type || !["income", "expense"].includes(body.type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });
    }

    const branchId = getEffectiveBranchId(request, user) || user.branchId;
    if (!branchId) return NextResponse.json({ error: "Sucursal no definida" }, { status: 400 });

    const movement = await prisma.cashMovement.create({
      data: {
        type: body.type,
        category: body.category || "otros",
        amount: Number(body.amount),
        description: body.description.trim().substring(0, 300),
        notes: body.notes ? String(body.notes).substring(0, 500) : null,
        createdBy: user.id,
        createdByName: user.email?.split("@")[0] || "Usuario",
        branchId,
      },
    });

    return NextResponse.json(movement);
  } catch (error: any) {
    console.error("[Cash] POST Error:", error);
    return NextResponse.json({ error: "Error al guardar", details: error?.message }, { status: 500 });
  }
}

// DELETE /api/cash?id=xxx — borrar movimiento (solo admin/superadmin)
export async function DELETE(request: Request) {
  try {
    const user = getUserFromToken(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.role === "tech") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.cashMovement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Cash] DELETE Error:", error);
    return NextResponse.json({ error: "Error al eliminar", details: error?.message }, { status: 500 });
  }
}
