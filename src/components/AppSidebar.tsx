"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";

interface Props {
  user: any;
}

interface Branch { id: string; name: string; }

const GROUPS = [
  {
    key: "recepcion",
    label: "Recepción",
    icon: "📥",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    items: [
      { path: "/dashboard", label: "Panel Principal", icon: "📋", adminsOnly: true },
      { path: "/asignaciones", label: "Mis Asignaciones", icon: "🔧", techOnly: true },
      { path: "/scanner", label: "Escáner QR", icon: "📷" },
    ],
  },
  {
    key: "catalogo",
    label: "Catálogo",
    icon: "📂",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    adminsOnly: true, // técnico no ve catálogo
    items: [
      { path: "/services", label: "Servicios", icon: "🛠️" },
      { path: "/inventory", label: "Inventario", icon: "📦" },
      { path: "/equipment", label: "Equipos", icon: "💻" },
      { path: "/consoles", label: "Consolas", icon: "🕹️" },
      { path: "/software", label: "Programas", icon: "💿" },
      { path: "/videogames", label: "Videojuegos", icon: "🎮" },
    ],
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: "📄",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    adminsOnly: true,
    items: [
      { path: "/quotations", label: "Cotizaciones", icon: "🧾" },
      { path: "/certificates", label: "Certificados", icon: "🏅" },
      { path: "/clients", label: "Clientes", icon: "👥" },
    ],
  },
  {
    key: "finanzas",
    label: "Finanzas",
    icon: "💰",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    adminsOnly: true,
    items: [
      { path: "/extracto", label: "Extracto", icon: "📊" },
      { path: "/stats", label: "Estadísticas", icon: "📈" },
      { path: "/cash", label: "Caja Chica", icon: "💵" },
    ],
  },
  {
    key: "imprimibles",
    label: "Imprimibles",
    icon: "🖨️",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    adminsOnly: true,
    items: [
      { path: "/qr-batch", label: "QR Múltiples", icon: "🏷️" },
      { path: "__monthly_report__", label: "Reporte Mensual", icon: "📥" },
    ],
  },
  {
    key: "admin",
    label: "Administración",
    icon: "⚙️",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    superadminOnly: true,
    items: [
      { path: "/admin/users", label: "Usuarios", icon: "👥" },
      { path: "/admin/branches", label: "Sucursales", icon: "🏢" },
      { path: "/admin/settings", label: "Configuración", icon: "⚙️" },
    ],
  },
];

export function AppSidebar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  // Auto-abrir el grupo que contiene la ruta actual
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) {
      if (g.items.some(i => i.path !== "__monthly_report__" && (pathname === i.path || pathname?.startsWith(i.path + "/")))) {
        initial[g.key] = true;
      }
    }
    setOpenMenus(initial);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
    if (user?.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => {
        if (Array.isArray(b)) {
          setBranches(b);
          const ab = sessionStorage.getItem("activeBranchId");
          if (ab) setActiveBranch(ab);
          else if (b.length) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); }
        }
      }).catch(() => {});
    } else { setActiveBranch(user?.branchId || ""); }
  }, [user]);

  const toggleMenu = (k: string) => setOpenMenus(p => ({ ...p, [k]: !p[k] }));

  const handleItemClick = (path: string) => {
    setMenuOpen(false);
    if (path === "__monthly_report__") {
      const d = new Date();
      const y = d.getFullYear(); const m = d.getMonth() + 1;
      const ab = activeBranch ? `?branchId=${activeBranch}` : "";
      window.open(`/reports/monthly/${y}/${m}${ab}`, "_blank");
      return;
    }
    router.push(path);
  };

  const isActive = (path: string) => path !== "__monthly_report__" && (pathname === path || pathname?.startsWith(path + "/"));

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", alignItems: "center", padding: "0 16px", zIndex: 50, gap: 12 }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", fontSize: 18, cursor: "pointer" }}>{menuOpen ? "✕" : "☰"}</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{settings.companyName}</span>
      </div>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 44 }} />}

      <aside className={`sidebar-desktop${menuOpen ? " open" : ""}`} style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 200, transition: "transform 0.3s ease", background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 45, padding: "0 10px" }}>
        <div style={{ padding: "18px 14px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {settings.logo ? <img src={settings.logo} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain" }} /> : <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔧</div>}
            <span style={{ fontSize: 14, fontWeight: 800 }}>{settings.companyName}</span>
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflow: "auto", padding: "4px 0" }}>
          {user?.role === "superadmin" && branches.length > 0 && (
            <div style={{ padding: "0 6px 12px", borderBottom: "1px solid rgba(99,102,241,0.1)", marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>🏢 Sucursal activa</div>
              <div style={{ position: "relative" }}>
                <select value={activeBranch} onChange={(e) => { setActiveBranch(e.target.value); setActiveBranchId(e.target.value); window.location.reload(); }} style={{ width: "100%", padding: "9px 28px 9px 12px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderLeft: "2px solid #6366f1", borderRadius: "0 10px 10px 0", color: "#c7d2fe", fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none", appearance: "none" }}>
                  {branches.map(b => <option key={b.id} value={b.id} style={{ background: "#111118", color: "#eeeef2" }}>{b.name}</option>)}
                </select>
                <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#6366f1", fontSize: 10, pointerEvents: "none" }}>▾</span>
              </div>
            </div>
          )}

          {GROUPS.filter(g => {
            if ((g as any).superadminOnly) return user?.role === "superadmin";
            if ((g as any).adminsOnly) return user?.role === "admin" || user?.role === "superadmin";
            return true;
          }).map(g => {
            const isOpen = !!openMenus[g.key];
            return (
              <div key={g.key}>
                <button className={`sidebar-group-btn${isOpen ? " open" : ""}`} onClick={() => toggleMenu(g.key)} style={{ background: g.bg, borderLeft: `2px solid ${g.color}`, color: g.color, borderRadius: "0 8px 8px 0" }}>
                  <span>{g.icon} {g.label}</span>
                  <span className="group-arrow" style={{ color: g.color }}>▾</span>
                </button>
                <div className={`sidebar-sub-list${isOpen ? " open" : ""}`}>
                  {g.items.filter((item: any) => {
                    if (item.techOnly) return user?.role === "tech";
                    if (item.adminsOnly) return user?.role === "admin" || user?.role === "superadmin";
                    return true;
                  }).map(item => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        className={`sidebar-btn sidebar-sub${active ? " active" : ""}`}
                        onClick={() => handleItemClick(item.path)}
                      >
                        <div className="sidebar-icon" style={{ background: active ? "rgba(99,102,241,0.15)" : "transparent" }}>{item.icon}</div>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 6px" }}>
          <div style={{ padding: "14px 10px", marginBottom: 8, background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.08)", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 auto 8px", overflow: "hidden" }}>
              {user?.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} /> : user?.name ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "?"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>{user?.name}</div>
            <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 20, background: user?.role === "superadmin" ? "rgba(251,191,36,0.15)" : user?.role === "tech" ? "rgba(168,85,247,0.15)" : "rgba(99,102,241,0.15)", color: user?.role === "superadmin" ? "#fbbf24" : user?.role === "tech" ? "#a855f7" : "#818cf8", fontWeight: 700 }}>
              {user?.role === "superadmin" ? "⭐ SUPER ADMIN" : user?.role === "tech" ? "🔧 TÉCNICO" : "👔 ADMIN"}
            </span>
          </div>
          {user?.role === "superadmin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              <button
                onClick={async () => {
                  try {
                    const { token } = JSON.parse(JSON.stringify({ token: sessionStorage.getItem("token") }));
                    const res = await fetch("/api/backup", { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) { alert("Error al exportar backup"); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `backup-repairtrack-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert("Error de red"); }
                }}
                style={{ width: "100%", padding: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                💾 Exportar Backup
              </button>
              <label style={{ width: "100%", padding: "8px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, color: "#3b82f6", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📥 Importar Backup
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!confirm("⚠️ Importar sobrescribirá los datos actuales. ¿Continuar?")) { e.target.value = ""; return; }
                    try {
                      const text = await file.text();
                      const token = sessionStorage.getItem("token");
                      const res = await fetch("/api/backup/import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: text });
                      if (res.ok) { alert("✅ Backup importado correctamente"); window.location.reload(); }
                      else { const err = await res.json().catch(() => ({})); alert("Error: " + (err.error || "No se pudo importar")); }
                    } catch { alert("Error al leer archivo"); }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} style={{ width: "100%", padding: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cerrar Sesión</button>
        </div>
      </aside>
    </>
  );
}
