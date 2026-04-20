import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

// Determina el tipo de documento a partir del path o de los query params
function extractDocumentInfo(path: string, url: string): { type: string | null; code: string | null } {
  try {
    const u = new URL(url);
    // Track routes
    if (path.startsWith("/track/")) {
      const code = path.replace("/track/", "").split("/")[0].split("?")[0].toUpperCase();
      if (code.startsWith("OT-")) return { type: "ot", code };
      if (code.startsWith("CE-")) return { type: "ce", code };
      if (code.startsWith("COT-")) return { type: "cot", code };
      if (code.startsWith("NV-")) return { type: "nv", code };
      if (code.startsWith("CL-")) return { type: "cl", code };
      return { type: "track", code };
    }
    if (path.startsWith("/certificate-view/")) {
      const code = path.replace("/certificate-view/", "").split("/")[0].split("?")[0].toUpperCase();
      return { type: "ce", code };
    }
    if (path.startsWith("/quotations/print/")) {
      const code = path.replace("/quotations/print/", "").split("/")[0].split("?")[0].toUpperCase();
      if (code.startsWith("COT-")) return { type: "cot", code };
      if (code.startsWith("NV-")) return { type: "nv", code };
      return { type: "quotation", code };
    }
    if (path.startsWith("/delivery/")) {
      const code = path.replace("/delivery/", "").replace("view/", "").split("/")[0].split("?")[0].toUpperCase();
      return { type: "ce", code };
    }
    // Portal with query params
    if (path === "/portal" || path.startsWith("/portal?")) {
      if (u.searchParams.get("eq")) return { type: "eq", code: u.searchParams.get("eq") };
      if (u.searchParams.get("cn")) return { type: "cn", code: u.searchParams.get("cn") };
      if (u.searchParams.get("vg")) return { type: "vg", code: u.searchParams.get("vg") };
      if (u.searchParams.get("sw")) return { type: "sw", code: u.searchParams.get("sw") };
      return { type: null, code: null };
    }
  } catch {}
  return { type: null, code: null };
}

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown"
  );
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + "|repairtrack-pageview-salt").digest("hex").substring(0, 32);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path, fullUrl, referrer } = body;
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { type, code } = extractDocumentInfo(path, fullUrl || path);
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent")?.substring(0, 300) || null;

    // Intentar asociar con sucursal
    let branchId: string | null = null;
    if (code && type) {
      try {
        if (type === "ot" || type === "ce") {
          // Track/CE codes llegan del Repair
          const cleanCode = code.replace(/^CE-/, "OT-");
          const repair = await prisma.repair.findFirst({ where: { code: cleanCode }, select: { branchId: true } });
          if (repair) branchId = repair.branchId;
        } else if (type === "cot" || type === "nv") {
          const q = await prisma.quotation.findFirst({ where: { code }, select: { branchId: true } });
          if (q) branchId = q.branchId;
        } else if (type === "eq") {
          const eq = await prisma.equipment.findFirst({ where: { id: code }, select: { branchId: true } });
          if (eq) branchId = eq.branchId;
        } else if (type === "cn") {
          const cn = await prisma.console.findFirst({ where: { id: code }, select: { branchId: true } });
          if (cn) branchId = cn.branchId;
        }
      } catch {}
    }

    await prisma.pageView.create({
      data: {
        path: path.substring(0, 500),
        documentType: type,
        documentCode: code ? code.substring(0, 50) : null,
        ipHash: hashIp(ip),
        userAgent: ua,
        referrer: referrer ? String(referrer).substring(0, 500) : null,
        branchId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PageView] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
