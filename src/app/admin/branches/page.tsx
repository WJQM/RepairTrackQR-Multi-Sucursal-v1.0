"use client";
import { sileo } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";

interface Branch { id: string; name: string; address: string | null; phone: string | null; active: boolean; createdAt: string; _count: { users: number; repairs: number }; }

export default function AdminBranchesPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allBranches, setAllBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await apiFetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        setAllBranches(data.map((b: Branch) => ({ id: b.id, name: b.name })));
        const ab = sessionStorage.getItem("activeBranchId");
        if (ab) setActiveBranchState(ab);
        else if (data.length > 0) { setActiveBranchState(data[0].id); setActiveBranchId(data[0].id); }
      }
    } catch {} setLoading(false);
  };

  const resetForm = () => { setFormName(""); setFormAddress(""); setFormPhone(""); setEditId(null); };

  const handleSubmit = async () => {
    if (!formName) return;
    const body = { name: formName, address: formAddress || null, phone: formPhone || null };
    try {
      const res = editId
        ? await apiFetch("/api/branches", { method: "PATCH", body: JSON.stringify({ id: editId, ...body }) })
        : await apiFetch("/api/branches", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) {
        sileo.success({ title: editId ? "Sucursal actualizada" : "Sucursal creada" });
        setShowForm(false); resetForm(); loadData();
      } else { const d = await res.json(); sileo.error({ title: `${d.error}` }); }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const startEdit = (b: Branch) => { setEditId(b.id); setFormName(b.name); setFormAddress(b.address || ""); setFormPhone(b.phone || ""); setShowForm(true); };

  const handleDelete = async (b: Branch) => {
    if (!confirm(`¿Desactivar sucursal "${b.name}"? Los datos se conservarán.`)) return;
    try {
      const res = await apiFetch("/api/branches", { method: "DELETE", body: JSON.stringify({ id: b.id }) });
      if (res.ok) { sileo.success({ title: "Sucursal desactivada" }); loadData(); }
    } catch {}
  };

  const logout = async () => { sessionStorage.clear(); await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(99,102,241,0.06); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(99,102,241,0.12); color: #818cf8; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        @media(max-width:768px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{margin-left:0!important;padding-top:72px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
        }
        .form-input { width: 100%; padding: 10px 14px; background: rgba(22,22,31,0.8); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 13px; outline: none; }
        .form-input:focus { border-color: #6366f1; }
      `}</style>

      {/* MOBILE HEADER */}
      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", alignItems: "center", padding: "0 16px", zIndex: 50, gap: 12 }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: "#818cf8" }}>{menuOpen ? "✕" : "☰"}</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{settings.companyName}</span>
      </div>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 44 }} />}

      {/* SIDEBAR */}
      <aside className={`sidebar-desktop${menuOpen ? " open" : ""}`} style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 200, transition: "transform 0.3s ease", background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 45, padding: "0 10px" }}>
        <div style={{ padding: "18px 14px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {settings.logo ? <img src={settings.logo} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} /> : <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px rgba(99,102,241,0.2)", flexShrink: 0 }}>🔧</div>}
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>{settings.companyName}</span>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflow: "auto", padding: "4px 0" }}>
          {allBranches.length > 0 && (
            <div style={{ padding: "0 6px 8px" }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" }}>🏢 Sucursal</label>
              <select value={activeBranch} onChange={(e) => { setActiveBranchState(e.target.value); setActiveBranchId(e.target.value); }} style={{ width: "100%", padding: "8px 10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "#eeeef2", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                {allBranches.map(b => <option key={b.id} value={b.id} style={{ background: "#111118" }}>{b.name}</option>)}
              </select>
            </div>
          )}
          {[{ label: "Panel Principal", path: "/dashboard", icon: "📋" }, { label: "Servicios", path: "/services", icon: "🛠️" }, { label: "Inventario", path: "/inventory", icon: "📦" }, { label: "Software", path: "/software", icon: "🎮" }, { label: "Escáner", path: "/scanner", icon: "📷" }, { label: "Cotizaciones", path: "/quotations", icon: "🧾" }, { label: "Extracto", path: "/extracto", icon: "📊" }, { label: "Usuarios", path: "/admin/users", icon: "👥" }, { label: "Sucursales", path: "/admin/branches", icon: "🏢", active: true }, { label: "Configuración", path: "/admin/settings", icon: "⚙️" }].map((item) => (
            <button key={item.path} className={`sidebar-btn${(item as any).active ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push(item.path); }}>
              <div className="sidebar-icon" style={{ background: (item as any).active ? "rgba(99,102,241,0.15)" : "transparent" }}>{item.icon}</div>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 6px" }}>
          <div style={{ padding: "14px 10px", marginBottom: 8, background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.08)", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 auto 8px", boxShadow: "0 4px 14px rgba(99,102,241,0.3)", overflow: "hidden" }}>
              {user?.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} /> : user?.name ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "?"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{user?.name}</div>
            <div style={{ display: "inline-block", fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 10px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>⭐ Super Admin</div>
          </div>
          <button onClick={logout} style={{ width: "100%", padding: "9px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>🚪 Cerrar Sesión</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content" style={{ marginLeft: 200, padding: "24px 28px", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>🏢 Gestión de Sucursales</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{branches.length} sucursales activas</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>＋ Nueva Sucursal</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Cargando...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {branches.map(b => (
              <div key={b.id} style={{ background: "var(--bg-card)", borderRadius: 18, border: "1px solid var(--border)", padding: "22px 20px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{b.name}</div>
                      {b.address && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>📍 {b.address}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(b)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "#818cf8", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                    <button onClick={() => handleDelete(b)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#6366f1" }}>{b._count.users}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Usuarios</div>
                  </div>
                  <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{b._count.repairs}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Órdenes</div>
                  </div>
                  {b.phone && (
                    <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>📱</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{b.phone}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setShowForm(false); resetForm(); }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", padding: "28px 24px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editId ? "✏️ Editar Sucursal" : "➕ Nueva Sucursal"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Nombre *</label>
                <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Sucursal Centro" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Dirección</label>
                <input className="form-input" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Dirección (opcional)" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Teléfono</label>
                <input className="form-input" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Teléfono (opcional)" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{editId ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
