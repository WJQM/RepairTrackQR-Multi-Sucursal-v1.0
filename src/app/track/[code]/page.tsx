"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PortalTracker } from "@/components/PortalTracker";
import { ReviewForm } from "@/components/ReviewForm";

interface Repair {
  id: string; code: string; device: string; brand: string | null; model: string | null;
  issue: string; status: string; priority: string; estimatedCost: number;
  notes: string | null; clientName: string | null; clientPhone: string | null;
  clientEmail: string | null; accessories: string | null; qrCode: string;
  createdAt: string; updatedAt: string;
}

const STATUS: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳", desc: "Tu equipo fue recibido y está en cola de revisión." },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6", icon: "🔍", desc: "El técnico revisó tu equipo e identificó el problema." },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦", desc: "Se solicitaron los repuestos necesarios para la reparación." },
  in_progress: { label: "En Progreso", color: "#3b82f6", icon: "🔧", desc: "Tu equipo está siendo reparado en este momento." },
  completed: { label: "Completado", color: "#10b981", icon: "✅", desc: "¡La reparación fue completada! Puedes pasar a recoger tu equipo." },
  delivered: { label: "Entregado", color: "#6b7280", icon: "📱", desc: "Tu equipo fue entregado. ¡Gracias por confiar en nosotros!" },
};

function parseAccessories(json: string | null): string[] { if (!json) return []; try { return JSON.parse(json); } catch { return []; } }
function parseNotesData(notesField: string | null): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[]; deliveryNotes: string; discount: string } {
  if (!notesField) return { notes: "", services: [], software: [], videogames: [], repuestos: [], deliveryNotes: "", discount: "" };
  const parts = notesField.split(" | ");
  const svcPart = parts.find(p => p.startsWith("Servicios: "));
  const swPart = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: "));
  const vgPart = parts.find(p => p.startsWith("Videojuegos: "));
  const rPart = parts.find(p => p.startsWith("Repuestos: "));
  const dPart = parts.find(p => p.startsWith("Entrega: "));
  const discPart = parts.find(p => p.startsWith("Descuento: "));
  const notesParts = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: ") && !p.startsWith("Descuento: "));
  const services = svcPart ? svcPart.replace("Servicios: ", "").split(", ").filter(Boolean) : [];
  const software = swPart ? swPart.replace("Programas: ", "").replace("Software: ", "").split(", ").filter(Boolean) : [];
  const videogames = vgPart ? vgPart.replace("Videojuegos: ", "").split(", ").filter(Boolean) : [];
  const repuestos = rPart ? rPart.replace("Repuestos: ", "").split(", ").filter(Boolean) : [];
  return { notes: notesParts.join(" | "), services, software, videogames, repuestos, deliveryNotes: dPart ? dPart.replace("Entrega: ", "") : "", discount: discPart ? discPart.replace("Descuento: ", "") : "" };
}

export default function TrackPage() {
  const params = useParams();
  const code = params.code as string;
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fromScanner, setFromScanner] = useState(false);
  const [multipleResults, setMultipleResults] = useState<any[]>([]);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null });

  useEffect(() => { setMounted(true); setFromScanner(new URLSearchParams(window.location.search).get("from") === "scanner"); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d); }).catch(() => {}); }, []);
  useEffect(() => { if (code) loadRepair(); }, [code]);

  const loadRepair = async () => {
    try {
      const branchId = new URLSearchParams(window.location.search).get("branchId");
      const url = branchId ? `/api/track/${code}?branchId=${branchId}` : `/api/track/${code}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.multiple) {
          setMultipleResults(data.repairs);
          setShowBranchPicker(true);
        } else {
          setRepair(data);
        }
      } else setNotFound(true);
    } catch { setNotFound(true); }
    setLoading(false);
  };

  const selectBranch = (r: any) => {
    setShowBranchPicker(false);
    setRepair(r);
  };

  const handleClose = () => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from === "scanner") { window.location.href = "/scanner"; }
    else if (from === "portal") { window.location.href = "/portal"; }
    else { window.close(); if (!window.closed) window.location.href = "/portal"; }
  };

  if (showBranchPicker) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 420, width: "100%", background: "rgba(17,17,24,0.95)", borderRadius: 24, border: "1px solid rgba(99,102,241,0.15)", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#eeeef2", marginBottom: 8 }}>Selecciona la Sucursal</h2>
          <p style={{ color: "#8888a0", fontSize: 13, marginBottom: 24 }}>La orden <strong style={{ color: "#818cf8" }}>{code}</strong> existe en varias sucursales</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {multipleResults.map((r: any) => (
              <button key={r.id} onClick={() => selectBranch(r)} style={{ padding: "14px 18px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, color: "#eeeef2", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                <span>🏢 {r.branch?.name || "Sucursal"}</span>
                <span style={{ fontSize: 12, color: "#818cf8" }}>{r.device}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.95); } }`}</style>
        <div style={{ textAlign: "center", animation: "pulse 1.5s ease-in-out infinite" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ color: "#8888a0", fontSize: 15, fontWeight: 500 }}>Buscando orden...</p>
        </div>
      </div>
    );
  }

  if (notFound || !repair) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{ textAlign: "center", padding: 48, background: "rgba(17,17,24,0.9)", borderRadius: 24, border: "1px solid rgba(239,68,68,0.15)", maxWidth: 420, animation: "fadeUp 0.5s ease-out", boxShadow: "0 0 60px rgba(239,68,68,0.05)" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>😔</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#eeeef2", marginBottom: 10 }}>No encontrada</h2>
          <p style={{ color: "#8888a0", fontSize: 14, lineHeight: 1.6 }}>No existe ninguna orden con el código:</p>
          <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#ef4444", margin: "12px 0", padding: "10px 20px", background: "rgba(239,68,68,0.06)", borderRadius: 10, display: "inline-block" }}>{code}</div>
          <p style={{ color: "#555568", fontSize: 13, marginTop: 12 }}>Verifica el código e intenta de nuevo</p>
          <button onClick={handleClose} style={{ marginTop: 20, padding: "10px 24px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, color: "#818cf8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← {fromScanner ? "Volver al Escáner" : "Cerrar"}</button>
        </div>
      </div>
    );
  }

  const status = STATUS[repair.status] || STATUS.pending;
  const statusKeys = Object.keys(STATUS);
  const currentIndex = statusKeys.indexOf(repair.status);
  const progress = ((currentIndex + 1) / statusKeys.length) * 100;
  const deviceName = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  const accessories = parseAccessories(repair.accessories);
  const { notes, services, software, videogames, repuestos, deliveryNotes, discount } = parseNotesData(repair.notes);

  return (
    <div style={{ minHeight: "100vh", background: "#050507", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <PortalTracker />
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes progressFill { from { width: 0%; } to { width: ${progress}%; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px ${status.color}20; } 50% { box-shadow: 0 0 40px ${status.color}35; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media(max-width:480px) {
          .track-grid { grid-template-columns: 1fr !important; }
          .track-card { padding: 20px 16px !important; border-radius: 20px !important; }
          .track-card h1 { font-size: 17px !important; }
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "50%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${status.color}08, transparent 70%)`, transform: "translateX(-50%)", animation: "pulse 5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.02, backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="track-card" style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 1, background: "linear-gradient(180deg, rgba(17,17,24,0.95), rgba(8,8,12,0.98))", borderRadius: 28, border: `1px solid ${status.color}15`, boxShadow: `0 0 80px ${status.color}06, 0 25px 60px rgba(0,0,0,0.5)`, overflow: "hidden", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: `linear-gradient(90deg, transparent, ${status.color}50, transparent)` }} />

        {/* Header */}
        <div style={{ padding: "28px 28px 24px", textAlign: "center", background: `linear-gradient(180deg, ${status.color}08, transparent)`, position: "relative" }}>
          <button onClick={handleClose} style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8888a0", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(99,102,241,0.08)", borderRadius: 20, marginBottom: 14, border: "1px solid rgba(99,102,241,0.1)" }}>
            {settings.logo ? <img src={settings.logo} alt="Logo" style={{ width: 18, height: 18, objectFit: "contain" }} /> : <span style={{ fontSize: 12 }}>🔧</span>}
            <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{settings.companyName}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px", color: "#eeeef2" }}>Seguimiento de Orden</h1>
        </div>

        {/* Status Banner */}
        <div style={{ margin: "0 20px", padding: "24px", borderRadius: 18, textAlign: "center", background: `linear-gradient(135deg, ${status.color}10, ${status.color}04)`, border: `1px solid ${status.color}20`, animation: "glowPulse 3s ease-in-out infinite" }}>
          <div style={{ fontSize: 44, marginBottom: 10, animation: "float 3s ease-in-out infinite" }}>{status.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: status.color, letterSpacing: "-0.3px" }}>{status.label}</div>
          <p style={{ fontSize: 13, color: "#8888a0", marginTop: 8, lineHeight: 1.6, maxWidth: 320, margin: "8px auto 0" }}>{status.desc}</p>
        </div>

        {/* Progress */}
        <div style={{ padding: "20px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#555568", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Progreso</span>
            <span style={{ fontSize: 11, color: status.color, fontWeight: 700 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(30,30,46,0.8)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${status.color}, ${status.color}cc)`, width: `${progress}%`, animation: "progressFill 1s ease-out", boxShadow: `0 0 10px ${status.color}40` }} />
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "20px 28px" }}>
          {/* Code */}
          <div style={{ textAlign: "center", padding: "14px", background: "rgba(22,22,31,0.6)", borderRadius: 14, marginBottom: 18, border: "1px solid rgba(30,30,46,0.5)" }}>
            <div style={{ fontSize: 10, color: "#555568", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 6 }}>Código de Orden</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#6366f1", letterSpacing: "2px" }}>{repair.code}</div>
          </div>

          {/* Cliente */}
          {(repair.clientName || repair.clientPhone) && (
            <div className="track-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {repair.clientName && (
                <div style={{ padding: "14px", background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>👤 Cliente</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#eeeef2" }}>{repair.clientName}</div>
                </div>
              )}
              {repair.clientPhone && (
                <div style={{ padding: "14px", background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>📱 Celular</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#eeeef2" }}>{repair.clientPhone}</div>
                </div>
              )}
            </div>
          )}

          {/* Info Grid */}
          <div className="track-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { label: "Dispositivo", value: deviceName, icon: "💻" },
              { label: "Costo Estimado", value: `Bs. ${repair.estimatedCost}`, icon: "💰" },
              { label: "Fecha Ingreso", value: new Date(repair.createdAt).toLocaleDateString("es-BO"), icon: "📅" },
              { label: "Última Actualización", value: new Date(repair.updatedAt).toLocaleDateString("es-BO"), icon: "🔄" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "14px", background: "rgba(22,22,31,0.5)", borderRadius: 12, border: "1px solid rgba(30,30,46,0.5)" }}>
                <div style={{ fontSize: 10, color: "#555568", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#eeeef2" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Problema */}
          <div style={{ padding: "14px 16px", background: "rgba(22,22,31,0.5)", borderRadius: 12, borderLeft: `3px solid ${status.color}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#555568", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>🔧 Problema Reportado</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#8888a0" }}>{repair.issue}</div>
          </div>

          {/* Observaciones */}
          {notes && (
            <div style={{ padding: "14px 16px", background: "rgba(245,158,11,0.04)", borderRadius: 12, borderLeft: "3px solid #f59e0b", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>📋 Observaciones</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#8888a0" }}>{notes}</div>
            </div>
          )}

          {/* Accesorios */}
          {accessories.length > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(16,185,129,0.04)", borderRadius: 12, borderLeft: "3px solid #10b981", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>🎒 Accesorios Entregados</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {accessories.map((a) => (<span key={a} style={{ padding: "4px 10px", background: "rgba(16,185,129,0.1)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#10b981" }}>✓ {a}</span>))}
              </div>
            </div>
          )}

          {/* Servicios */}
          {services.length > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(168,85,247,0.04)", borderRadius: 12, borderLeft: "3px solid #a855f7", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>🛠️ Servicios</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {services.map((name) => (<span key={name} style={{ padding: "4px 10px", background: "rgba(168,85,247,0.1)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#a855f7" }}>{name}</span>))}
              </div>
            </div>
          )}

          {/* Programas */}
          {software.length > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(139,92,246,0.04)", borderRadius: 12, borderLeft: "3px solid #8b5cf6", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>💿 Programas a Instalar</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {software.map((name) => (<span key={name} style={{ padding: "4px 10px", background: "rgba(139,92,246,0.1)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#8b5cf6" }}>{name}</span>))}
              </div>
            </div>
          )}

          {/* Videojuegos */}
          {videogames.length > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.04)", borderRadius: 12, borderLeft: "3px solid #ef4444", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>🎮 Videojuegos a Instalar</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {videogames.map((name) => (<span key={name} style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#ef4444" }}>{name}</span>))}
              </div>
            </div>
          )}

          {/* Repuestos */}
          {repuestos.length > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(245,158,11,0.04)", borderRadius: 12, borderLeft: "3px solid #f59e0b", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>📦 Repuestos Utilizados</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {repuestos.map((name) => (<span key={name} style={{ padding: "4px 10px", background: "rgba(245,158,11,0.1)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>{name}</span>))}
              </div>
            </div>
          )}

          {/* Notas de Entrega */}
          {deliveryNotes && (
            <div style={{ padding: "14px 16px", background: "rgba(107,114,128,0.04)", borderRadius: 12, borderLeft: "3px solid #6b7280", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>📋 Notas de Entrega</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#8888a0" }}>{deliveryNotes}</div>
            </div>
          )}

          {/* Descuento */}
          {Number(discount) > 0 && (
            <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.04)", borderRadius: 12, borderLeft: "3px solid #ef4444", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>🏷️ Descuento Aplicado</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>- Bs. {discount}</div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#555568", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 14 }}>Estado Detallado</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(STATUS).map(([key, val], i) => {
                const done = i <= currentIndex;
                const current = i === currentIndex;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 12, background: current ? `${val.color}08` : "transparent", border: current ? `1px solid ${val.color}15` : "1px solid transparent", transition: "all 0.3s" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, background: done ? `${val.color}15` : "rgba(22,22,31,0.5)", border: `2px solid ${done ? val.color : "rgba(30,30,46,0.5)"}`, boxShadow: current ? `0 0 12px ${val.color}25` : "none", opacity: done ? 1 : 0.3 }}>
                      {done && i < currentIndex ? "✓" : val.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: current ? 700 : 500, color: done ? "#eeeef2" : "#555568" }}>{val.label}</span>
                    </div>
                    {current && (<div style={{ width: 8, height: 8, borderRadius: "50%", background: val.color, boxShadow: `0 0 8px ${val.color}60`, animation: "pulse 2s ease-in-out infinite" }} />)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: "25%", right: "25%", height: 1, background: `linear-gradient(90deg, transparent, ${status.color}30, transparent)` }} />
      </div>

      {/* Reseña del cliente — solo si OT entregada */}
      {repair.status === "delivered" && (
        <div style={{ width: "100%", maxWidth: 620, marginTop: 20, position: "relative", zIndex: 2 }}>
          <ReviewForm repairCode={repair.code} clientName={repair.clientName} />
        </div>
      )}
    </div>
  );
}