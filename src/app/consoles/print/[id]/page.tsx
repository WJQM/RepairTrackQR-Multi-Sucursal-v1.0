"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface ConsoleItem {
  id: string; code: string; name: string; category: string | null; state: string | null;
  brand: string | null; model: string | null; color: string | null;
  storage: string | null; generation: string | null; price: number;
  image: string | null; branch?: { id: string; name: string } | null;
}

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr.filter(Boolean); } catch {}
  return img.trim() ? [img] : [];
}

function getDisplayName(cn: ConsoleItem): string {
  return [cn.brand, cn.name, cn.model].filter(Boolean).join(" ").trim() || cn.name;
}

export default function ConsoleQRPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [cn, setCn] = useState<ConsoleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [stickerSize, setStickerSize] = useState<"small" | "medium" | "large">("medium");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    apiFetch("/api/consoles").then(r => r.ok ? r.json() : []).then((items: ConsoleItem[]) => {
      if (Array.isArray(items)) {
        const found = items.find(it => it.id === id);
        if (found) setCn(found);
        else setNotFound(true);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando...</div>;
  if (notFound || !cn) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Consola no encontrada</div>;

  const imgs = parseImages(cn.image);
  const mainImg = imgs[0] || null;
  const dName = getDisplayName(cn);
  const shortCode = cn.code || "CN-?";
  const portalUrl = baseUrl ? `${baseUrl}/portal?cn=${cn.id}` : "";

  const color = "#f97316"; // naranja — color distintivo de Consolas
  const accent = "#9a3412";

  const sizeMap = {
    small: { qr: 140, card: 200, title: 11, code: 14, brand: 8, sub: 8, img: 60 },
    medium: { qr: 200, card: 280, title: 13, code: 18, brand: 9, sub: 9, img: 80 },
    large: { qr: 280, card: 380, title: 15, code: 22, brand: 10, sub: 10, img: 100 },
  };
  const sz = sizeMap[stickerSize];
  const qrImg = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=${sz.qr * 2}x${sz.qr * 2}&data=${encodeURIComponent(portalUrl)}&color=1a1a2e&margin=2` : "";

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        @media print {
          @page { size: auto; margin: 6mm; }
          .no-print { display: none !important; }
          .sticker-wrap { padding: 0 !important; min-height: auto !important; }
          .sticker-card { border: 2px dashed #888 !important; box-shadow: none !important; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, padding: "12px 24px", background: "#111118", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>🏷️ Sticker QR Consola · {shortCode}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, background: "#1e1e2e", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => setStickerSize("small")} style={{ padding: "7px 12px", background: stickerSize === "small" ? color : "transparent", border: "none", color: stickerSize === "small" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>S</button>
            <button onClick={() => setStickerSize("medium")} style={{ padding: "7px 12px", background: stickerSize === "medium" ? color : "transparent", border: "none", color: stickerSize === "medium" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>M</button>
            <button onClick={() => setStickerSize("large")} style={{ padding: "7px 12px", background: stickerSize === "large" ? color : "transparent", border: "none", color: stickerSize === "large" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>L</button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(portalUrl); }} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔗 Copiar link</button>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: color, border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#1e1e2e", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div className="sticker-wrap" style={{ display: "flex", justifyContent: "center", padding: "28px 16px", minHeight: "calc(100vh - 60px)" }}>
        <div className="sticker-card" style={{
          width: sz.card,
          background: "#fff",
          border: "2px dashed #bbb",
          borderRadius: 10,
          padding: "14px 14px 12px",
          textAlign: "center",
          boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 20, height: 20, objectFit: "contain" }} />}
            <span style={{ fontSize: sz.brand, fontWeight: 800, color: accent, letterSpacing: "-0.2px" }}>{settings.companyName}</span>
          </div>

          <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 14, background: color, color: "#fff", fontSize: sz.brand, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
            🕹️ Consola
          </div>

          <div style={{ fontSize: sz.title, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2, marginBottom: 2, padding: "0 4px" }}>
            {dName}
          </div>
          {cn.category && <div style={{ fontSize: sz.sub, color: "#666", marginBottom: 8, fontWeight: 500 }}>{cn.category}{cn.state && ` · ${cn.state}`}</div>}

          {mainImg && (
            <div style={{ margin: "6px auto 8px", width: sz.img, height: sz.img, borderRadius: 8, overflow: "hidden", border: `2px solid ${color}`, background: "#f5f5f5" }}>
              <img src={mainImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          <div style={{ display: "inline-block", padding: 6, background: "#fff", border: `2px solid ${color}`, borderRadius: 8 }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" width={sz.qr} height={sz.qr} style={{ display: "block" }} />
            ) : (
              <div style={{ width: sz.qr, height: sz.qr, background: "#f3f4f6" }} />
            )}
          </div>

          <div style={{ fontSize: sz.code, fontWeight: 800, color: color, fontFamily: "monospace", marginTop: 6, letterSpacing: "0.5px" }}>{shortCode}</div>

          {cn.price > 0 && <div style={{ fontSize: sz.title, fontWeight: 800, color: "#10b981", marginTop: 4 }}>Bs. {cn.price.toFixed(2)}</div>}

          <div style={{ fontSize: sz.sub, color: "#666", marginTop: 4, fontWeight: 600 }}>📱 Escanea para ver detalles</div>
        </div>
      </div>
    </div>
  );
}
