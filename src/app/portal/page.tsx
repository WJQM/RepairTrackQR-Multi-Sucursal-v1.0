"use client";
import { useEffect, useState, useRef } from "react";

interface InventoryItem {
  id: string; name: string; category: string | null; quantity: number;
  price: number; image: string | null; branch?: { id: string; name: string } | null;
}
interface SoftwareItem {
  id: string; name: string; category: string | null; image: string | null;
  minRequirements: string | null; recRequirements: string | null; size: string | null;
  branch?: { id: string; name: string } | null;
}

export default function PortalPage() {
  const [tab, setTab] = useState<"inventory" | "software">("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [software, setSoftware] = useState<SoftwareItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSw, setSelectedSw] = useState<SoftwareItem | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerDivId = "portal-qr-reader";
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null; slogan: string }>({ companyName: "RepairTrackQR", logo: null, slogan: "" });

  useEffect(() => { setMounted(true); loadData(); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo, slogan: d.slogan }); }).catch(() => {}); }, []);
  useEffect(() => { const interval = setInterval(() => loadData(true), 15000); return () => clearInterval(interval); }, []);

  const handleQrResult = (decodedText: string) => {
    const detected = detectQR(decodedText);
    navigateTo(detected);
  };

  function detectQR(text: string): { type: string; code: string } {
    const t = text.trim();
    if (t.includes("/delivery/")) return { type: "delivery", code: t.split("/delivery/").pop()?.split("?")[0] || t };
    if (t.includes("/track/")) return { type: "track", code: t.split("/track/").pop()?.split("?")[0] || t };
    if (t.includes("/quotations?view=")) { const id = t.split("view=").pop()?.split("&")[0] || t; return { type: id.startsWith("NV") ? "sale" : "quotation", code: id }; }
    const upper = t.toUpperCase();
    if (upper.startsWith("CE-")) return { type: "delivery", code: `OT-${upper.replace("CE-", "")}` };
    if (upper.startsWith("AE-")) return { type: "delivery", code: `OT-${upper.replace("AE-", "")}` };
    if (upper.startsWith("COT-")) return { type: "quotation", code: t };
    if (upper.startsWith("NV-")) return { type: "sale", code: t };
    return { type: "track", code: t };
  }

  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError] = useState("");

  const [branchPickerData, setBranchPickerData] = useState<{repairs: any[], type: string, code: string} | null>(null);

  const navigateTo = async (detected: { type: string; code: string }) => {
    setNavigating(true); setNavError("");
    if (detected.type === "quotation" || detected.type === "sale") {
      try {
        const res = await fetch(`/api/quotations?code=${detected.code}`);
        if (!res.ok) { setNavError(`No se encontró el documento: ${detected.code}`); setNavigating(false); return; }
        const data = await res.json();
        if (data.multiple) {
          setBranchPickerData({ repairs: data.quotations.map((q: any) => ({ ...q, device: q.clientName || q.code })), type: detected.type, code: detected.code });
          setNavigating(false); return;
        }
        setNavigating(false);
        window.open(`/quotations/print/${detected.code}?branchId=${data.branchId}`, "_blank");
        return;
      } catch { setNavError("Error al buscar el documento"); setNavigating(false); return; }
    }
    if (detected.type === "delivery") {
      try {
        const res = await fetch(`/api/track/${detected.code}`);
        if (!res.ok) { setNavError(`No se encontró la orden: ${detected.code}`); setNavigating(false); return; }
        const data = await res.json();
        if (data.multiple) { setBranchPickerData({ repairs: data.repairs, type: "delivery", code: detected.code }); setNavigating(false); return; }
        setNavigating(false);
        window.open(`/delivery/view/${detected.code}?branchId=${data.branchId}`, "_blank");
        return;
      } catch { setNavError("Error al buscar la orden"); setNavigating(false); return; }
    }
    // track / code
    try {
      const res = await fetch(`/api/track/${detected.code}`);
      if (!res.ok) { setNavError(`No se encontró la orden: ${detected.code}`); setNavigating(false); return; }
      const data = await res.json();
      if (data.multiple) { setBranchPickerData({ repairs: data.repairs, type: "track", code: detected.code }); setNavigating(false); return; }
      setNavigating(false);
      window.location.href = `/track/${detected.code}?from=portal&branchId=${data.branchId}`;
    } catch { setNavError("Error al buscar la orden"); setNavigating(false); return; }
  };

  const handleBranchSelect = (repair: any) => {
    const branchId = repair.branchId;
    if (branchPickerData?.type === "delivery") {
      window.open(`/delivery/view/${branchPickerData.code}?branchId=${branchId}`, "_blank");
    } else if (branchPickerData?.type === "quotation" || branchPickerData?.type === "sale") {
      window.open(`/quotations/print/${branchPickerData.code}?branchId=${branchId}`, "_blank");
    } else {
      window.location.href = `/track/${branchPickerData?.code}?from=portal&branchId=${branchId}`;
    }
    setBranchPickerData(null);
  };

  const startScanner = async () => {
    setShowScanner(true);
    setScannerError("");
    setScannerReady(false);
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => { stopScanner(); handleQrResult(decodedText); },
          () => {}
        );
        setScannerReady(true);
      } catch (err: any) {
        console.error(err);
        setScannerError(
          err?.name === "NotReadableError" || err?.message?.includes("video source")
            ? "La cámara está ocupada o no disponible. Cierra otras apps que la usen e intenta de nuevo, o sube una foto del QR."
            : err?.name === "NotAllowedError"
            ? "Permiso de cámara denegado. Permite el acceso en la configuración del navegador o sube una foto del QR."
            : "No se pudo iniciar la cámara. Puedes subir una foto del QR en su lugar."
        );
      }
    }, 200);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("portal-qr-file-temp");
      const result = await scanner.scanFile(file, true);
      handleQrResult(result);
    } catch {
      setScannerError("No se pudo leer el QR de la imagen. Intenta con otra foto más clara.");
    }
    e.target.value = "";
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    setShowScanner(false);
    setScannerReady(false);
    setScannerError("");
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [invRes, swRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/software")]);
      if (invRes.ok) setInventory(await invRes.json());
      if (swRes.ok) setSoftware(await swRes.json());
    } catch {}
    if (!silent) setLoading(false);
  };

  const invCategories = ["all", ...Array.from(new Set(inventory.map(i => i.category).filter(Boolean))) as string[]];
  const swCategories = ["all", ...Array.from(new Set(software.map(s => s.category).filter(Boolean))) as string[]];
  const categories = tab === "inventory" ? invCategories : swCategories;
  const allBranches = ["all", ...Array.from(new Set([...inventory, ...software].map((x: any) => x.branch?.name).filter(Boolean))) as string[]];

  const filteredInventory = inventory.filter(i =>
    i.quantity > 0 &&
    (search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || i.category === categoryFilter) &&
    (branchFilter === "all" || i.branch?.name === branchFilter)
  );
  const filteredSoftware = software.filter(s =>
    (search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || (s.category || "").toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === "all" || s.category === categoryFilter) &&
    (branchFilter === "all" || s.branch?.name === branchFilter)
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .portal-card { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
        .portal-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); border-color: rgba(99,102,241,0.3) !important; }
        .tab-btn { padding: 10px 24px; border-radius: 12px; border: 1px solid transparent; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted); }
        .tab-btn:hover { color: var(--text-secondary); background: var(--bg-hover); }
        .tab-btn.active { background: rgba(99,102,241,0.12); color: #818cf8; border-color: rgba(99,102,241,0.2); }
        .cat-chip { padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted); white-space: nowrap; }
        .cat-chip:hover { border-color: rgba(99,102,241,0.3); color: var(--text-secondary); }
        .cat-chip.active { background: rgba(99,102,241,0.12); color: #818cf8; border-color: rgba(99,102,241,0.3); }
        .skeleton { background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
        @media(max-width:768px) {
          .portal-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .portal-header-content { flex-direction: column; text-align: center; }
          .portal-header-content h1 { font-size: 22px !important; }
          .portal-search { width: 100% !important; }
          .tab-btn { padding: 8px 16px; font-size: 13px; }
          .portal-top-bar { flex-direction: column; gap: 12px !important; }
          .cat-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap !important; }
          .portal-track-actions { flex-direction: column !important; }
          .portal-track-actions > * { width: 100% !important; flex: unset !important; }
          .portal-track-actions > div { width: 100% !important; }
          .portal-codes-ref { flex-wrap: wrap; }
        }
        @media(max-width:480px) {
          .portal-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .portal-header-content h1 { font-size: 19px !important; }
          .tab-btn { padding: 8px 12px; font-size: 12px; }
          .tab-btn span { display: none; }
        }
      `}</style>

      {/* Background effects */}
      <div style={{ position: "absolute", top: "5%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)", transform: "translateX(-50%)", animation: "pulse 8s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.04), transparent 70%)", animation: "pulse 10s ease-in-out infinite 2s", pointerEvents: "none" }} />

      {/* Image viewer modal */}
      {viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={viewImage} alt="Producto" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "block" }} />
            <button onClick={() => setViewImage(null)} style={{ position: "absolute", top: -12, right: -12, width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}



      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 20px 60px", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>

        {/* Header */}
        <div className="portal-header-content" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          {settings.logo ? <img src={settings.logo} alt="Logo" style={{ width: 56, height: 56, borderRadius: 16, objectFit: "contain", flexShrink: 0 }} /> : <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 8px 30px rgba(99,102,241,0.3)", flexShrink: 0 }}>🛠️</div>}
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #eeeef2, #8888a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Portal de Cliente</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{settings.slogan || "Explora nuestro catálogo de productos y software disponible"}</p>
          </div>
        </div>

        {/* Track order section */}
        <div style={{ padding: "18px 20px", background: "rgba(16,185,129,0.06)", borderRadius: 16, border: "1px solid rgba(16,185,129,0.15)", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>📍</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>Consultar Documento</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Escanea cualquier QR o ingresa el código manualmente</div>
            </div>
          </div>

          {/* Codes reference */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }} className="portal-codes-ref">
            {[
              { prefix: "OT-#", label: "Seguimiento", color: "#6366f1", icon: "📋" },
              { prefix: "CE-#", label: "Entrega", color: "#10b981", icon: "📄" },
              { prefix: "COT-#", label: "Cotización", color: "#f59e0b", icon: "🧾" },
              { prefix: "NV-#", label: "Nota de Venta", color: "#a855f7", icon: "💰" },
            ].map(doc => (
              <span key={doc.prefix} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: `${doc.color}12`, color: doc.color, border: `1px solid ${doc.color}20`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {doc.icon} {doc.prefix}
              </span>
            ))}
          </div>

          <div className="portal-track-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={startScanner} style={{ padding: "12px 22px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", justifyContent: "center" }}>
              📷 Escanear QR
            </button>
            <div style={{ display: "flex", flex: "1 1 auto", gap: 8 }}>
              <input
                id="trackInput"
                placeholder="OT-1, CE-1, COT-1, NV-1..."
                style={{ flex: 1, padding: "12px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)", fontSize: 14, outline: "none", minWidth: 120, fontFamily: "monospace", fontWeight: 600 }}
                onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) handleQrResult(v); } }}
              />
              <button
                onClick={() => { const el = document.getElementById("trackInput") as HTMLInputElement; if (el?.value.trim()) handleQrResult(el.value.trim()); }}
                disabled={navigating}
                style={{ padding: "12px 20px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: navigating ? "wait" : "pointer", whiteSpace: "nowrap", opacity: navigating ? 0.7 : 1 }}
              >{navigating ? "..." : "Buscar"}</button>
            </div>
          </div>

          {navError && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(239,68,68,0.06)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.15)" }}>
              <p style={{ fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>⚠️ {navError}</p>
            </div>
          )}
          {navigating && (
            <div style={{ marginTop: 12, textAlign: "center", padding: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Buscando documento...</p>
            </div>
          )}
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 400, background: "var(--bg-card)", borderRadius: 20, border: "1px solid rgba(99,102,241,0.2)", overflow: "hidden", animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📷</span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Escanear QR</h3>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Apunta al código QR de tu orden</p>
                  </div>
                </div>
                <button onClick={stopScanner} style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: 16 }}>
                <div id={scannerDivId} style={{ width: "100%", borderRadius: 12, overflow: "hidden", display: scannerError ? "none" : "block" }} />
                <div id="portal-qr-file-temp" style={{ display: "none" }} />
                {!scannerReady && !scannerError && (
                  <div style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }}>📷</div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Iniciando cámara...</p>
                  </div>
                )}
                {scannerError && (
                  <div style={{ padding: "24px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <p style={{ fontSize: 13, color: "#f59e0b", lineHeight: 1.6, marginBottom: 20 }}>{scannerError}</p>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: "none" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        🖼️ Subir foto del QR
                      </button>
                      <button onClick={() => { stopScanner(); setTimeout(startScanner, 300); }} style={{ width: "100%", padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        🔄 Reintentar cámara
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!scannerError && (
                <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: "none" }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    🖼️ Subir foto
                  </button>
                  <button onClick={stopScanner} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="portal-top-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`tab-btn${tab === "inventory" ? " active" : ""}`} onClick={() => { setTab("inventory"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); }}>
              📦 Productos <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({inventory.filter(i => i.quantity > 0).length})</span>
            </button>
            <button className={`tab-btn${tab === "software" ? " active" : ""}`} onClick={() => { setTab("software"); setSearch(""); setCategoryFilter("all"); setBranchFilter("all"); }}>
              🎮 Software <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({software.length})</span>
            </button>
          </div>
          <div className="portal-search" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 12, padding: "0 14px", border: "1px solid var(--border)", width: 300 }}>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>🔍</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "inventory" ? "Buscar producto..." : "Buscar software..."}
              style={{ flex: 1, border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
            />
            {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>✕</span>}
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 2 && (
          <div className="cat-scroll" style={{ display: "flex", gap: 8, marginBottom: 10, paddingBottom: 4 }}>
            {categories.map(cat => (
              <button key={cat} className={`cat-chip${categoryFilter === cat ? " active" : ""}`} onClick={() => setCategoryFilter(cat)}>
                {cat === "all" ? "Todos" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Branch filters */}
        {allBranches.length > 2 && (
          <div className="cat-scroll" style={{ display: "flex", gap: 8, marginBottom: 20, paddingBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", padding: "6px 0", whiteSpace: "nowrap" }}>🏢</span>
            {allBranches.map(b => (
              <button key={b} className={`cat-chip${branchFilter === b ? " active" : ""}`} onClick={() => setBranchFilter(b)} style={branchFilter === b ? { borderColor: "#818cf8", background: "rgba(99,102,241,0.15)", color: "#818cf8" } : {}}>
                {b === "all" ? "Todas" : b}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 280 }} />
            ))}
          </div>
        )}

        {/* Inventory Grid */}
        {!loading && tab === "inventory" && (
          <>
            {filteredInventory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontraron productos</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? "Intenta con otro término de búsqueda" : "No hay productos disponibles en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {filteredInventory.map((item, i) => (
                  <div key={item.id} className="portal-card" style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both` }}>
                    {item.image ? (
                      <div onClick={() => setViewImage(item.image)} style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", cursor: "pointer", position: "relative" }}>
                        <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                        <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", fontSize: 11, fontWeight: 700, color: item.quantity <= 5 ? "#ef4444" : "#10b981" }}>
                          Stock: {item.quantity}
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, var(--bg-tertiary), var(--bg-hover))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                        <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.4)", fontSize: 11, fontWeight: 700, color: item.quantity <= 5 ? "#ef4444" : "#10b981" }}>
                          Stock: {item.quantity}
                        </div>
                      </div>
                    )}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {item.category && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.category}</span>}
                        {item.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>🏢 {item.branch.name}</span>}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text-primary)", lineHeight: 1.3 }}>{item.name}</h3>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>Bs. {item.price}</span>
                        <span style={{ fontSize: 11, color: item.quantity <= 5 ? "#ef4444" : "var(--text-muted)", fontWeight: 600 }}>
                          {item.quantity <= 5 ? "⚠️ Pocas unidades" : "✅ Disponible"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Software Grid */}
        {!loading && tab === "software" && (
          <>
            {filteredSoftware.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>No se encontró software</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{search ? "Intenta con otro término de búsqueda" : "No hay software disponible en este momento"}</p>
              </div>
            ) : (
              <div className="portal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                {filteredSoftware.map((sw, i) => (
                  <div key={sw.id} className="portal-card" style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", animation: `fadeUp 0.4s ease-out ${i * 0.05}s both` }}>
                    {sw.image ? (
                      <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                        <img src={sw.image} alt={sw.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                      </div>
                    ) : (
                      <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.08))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 48, opacity: 0.3 }}>🎮</span>
                      </div>
                    )}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {sw.category && <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.5px" }}>{sw.category}</span>}
                        {sw.branch && <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>🏢 {sw.branch.name}</span>}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "var(--text-primary)", lineHeight: 1.3 }}>{sw.name}</h3>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {sw.size && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "#818cf8", fontWeight: 600 }}>💾 {sw.size}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 60, textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            📍 Para consultas sobre disponibilidad o precios, contacta con nuestro equipo
          </p>
        </div>
      </div>

      {/* Branch Picker Modal */}
      {branchPickerData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setBranchPickerData(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "rgba(17,17,24,0.98)", borderRadius: 24, border: "1px solid rgba(99,102,241,0.15)", padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#eeeef2", marginBottom: 8 }}>Selecciona la Sucursal</h2>
            <p style={{ color: "#8888a0", fontSize: 13, marginBottom: 24 }}>La orden <strong style={{ color: "#818cf8" }}>{branchPickerData.code}</strong> existe en varias sucursales</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {branchPickerData.repairs.map((r: any) => (
                <button key={r.id} onClick={() => handleBranchSelect(r)} style={{ padding: "14px 18px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, color: "#eeeef2", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                  <span>🏢 {r.branch?.name || "Sucursal"}</span>
                  <span style={{ fontSize: 12, color: "#818cf8" }}>{r.device} - {r.clientName || "Sin nombre"}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setBranchPickerData(null)} style={{ marginTop: 16, padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#8888a0", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
