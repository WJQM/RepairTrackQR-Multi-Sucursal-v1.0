"use client";
import { sileo } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";

interface User { id: string; name: string; email: string; role: string; status: string; phone: string | null; image: string | null; branchId: string | null; branch: { id: string; name: string } | null; createdAt: string; }
interface Branch { id: string; name: string; }

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  superadmin: { label: "Super Admin", color: "#f59e0b", icon: "⭐" },
  admin: { label: "Administrador", color: "#6366f1", icon: "👤" },
  tech: { label: "Técnico", color: "#10b981", icon: "🔧" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("admin");
  const [formPhone, setFormPhone] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formImagePreview, setFormImagePreview] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  // Transfer
  const [showTransfer, setShowTransfer] = useState<User | null>(null);
  const [transferBranchId, setTransferBranchId] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);
    loadData();
    apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranchState(ab); else if (b.length > 0) { setActiveBranchState(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
  }, []);

  const loadData = async () => { try { const res = await apiFetch("/api/users"); if (res.ok) setUsers(await res.json()); } catch {} setLoading(false); };

  const resetForm = () => { setFormName(""); setFormEmail(""); setFormPassword(""); setFormRole("admin"); setFormPhone(""); setFormBranchId(""); setFormImage(""); setFormImagePreview(""); setEditId(null); };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImg(true);
    const fd = new FormData(); fd.append("file", file);
    try { const res = await fetch("/api/upload", { method: "POST", body: fd }); const d = await res.json(); if (d.url) { setFormImage(d.url); setFormImagePreview(URL.createObjectURL(file)); } } catch {}
    setUploadingImg(false);
  };

  const handleSubmit = async () => {
    if (!formName || !formEmail || (!editId && !formPassword)) return;
    if ((formRole === "admin" || formRole === "tech") && !formBranchId) { sileo.error({ title: "Selecciona una sucursal" }); return; }
    const body: any = { name: formName, email: formEmail, role: formRole, phone: formPhone || null, branchId: formRole === "superadmin" ? null : formBranchId, image: formImage || null };
    if (formPassword) body.password = formPassword;
    try {
      const res = editId ? await apiFetch("/api/users", { method: "PATCH", body: JSON.stringify({ id: editId, ...body }) }) : await apiFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
      if (res.ok) { sileo.success({ title: editId ? "Usuario actualizado" : "Usuario creado" }); setShowForm(false); resetForm(); loadData(); } else { const d = await res.json(); sileo.error({ title: `${d.error}` }); }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const startEdit = (u: User) => { setEditId(u.id); setFormName(u.name); setFormEmail(u.email); setFormPassword(""); setFormRole(u.role); setFormPhone(u.phone || ""); setFormBranchId(u.branchId || ""); setFormImage(u.image || ""); setFormImagePreview(u.image || ""); setShowForm(true); };
  const handleDelete = async (u: User) => { if (!confirm(`¿Eliminar a ${u.name}?`)) return; try { const res = await apiFetch("/api/users", { method: "DELETE", body: JSON.stringify({ id: u.id }) }); if (res.ok) { sileo.success({ title: "Eliminado" }); loadData(); } else { const d = await res.json(); sileo.error({ title: `${d.error}` }); } } catch {} };
  const handleApprove = async (u: User) => { try { const res = await apiFetch("/api/users", { method: "PATCH", body: JSON.stringify({ id: u.id, status: "active" }) }); if (res.ok) { sileo.success({ title: `${u.name} aprobado` }); loadData(); } } catch {} };
  const handleReject = async (u: User) => { if (!confirm(`¿Rechazar a ${u.name}?`)) return; try { await apiFetch("/api/users", { method: "DELETE", body: JSON.stringify({ id: u.id }) }); sileo.error({ title: "Rechazado" }); loadData(); } catch {} };
  const handleSuspend = async (u: User) => { const s = u.status === "suspended" ? "active" : "suspended"; try { const res = await apiFetch("/api/users", { method: "PATCH", body: JSON.stringify({ id: u.id, status: s }) }); if (res.ok) { sileo.success({ title: s === "active" ? "Reactivado" : "Suspendido" }); loadData(); } } catch {} };
  const handleTransfer = async () => { if (!showTransfer || !transferBranchId) return; try { const res = await apiFetch("/api/users", { method: "PATCH", body: JSON.stringify({ id: showTransfer.id, branchId: transferBranchId }) }); if (res.ok) { sileo.info({ title: `Transferido` }); setShowTransfer(null); loadData(); } } catch {} };
  const logout = async () => { sessionStorage.clear(); await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); };

  const filtered = users.filter(u => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const pendingUsers = filtered.filter(u => u.status === "pending");
  const activeUsers = filtered.filter(u => u.status !== "pending");

  const UserCard = ({ u, isPending }: { u: User; isPending?: boolean }) => {
    const r = ROLE_LABELS[u.role] || { label: u.role, color: "#888", icon: "❓" };
    const isSuspended = u.status === "suspended";
    return (
      <div style={{ background: "var(--bg-card)", borderRadius: 16, border: isPending ? "2px solid rgba(245,158,11,0.3)" : isSuspended ? "1px solid rgba(239,68,68,0.2)" : "1px solid var(--border)", display: "flex", overflow: "hidden", opacity: isSuspended ? 0.6 : 1 }}>
        {/* Photo */}
        <div style={{ width: 100, minWidth: 100, background: u.image ? "#000" : `linear-gradient(135deg, ${r.color}18, ${r.color}06)`, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)" }}>
          {u.image
            ? <img src={u.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ fontSize: 32, fontWeight: 800, color: r.color, opacity: 0.6, letterSpacing: -1 }}>{u.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}</div>
          }
        </div>
        {/* Info */}
        <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          {/* Row 1: name + actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
            </div>
            {isPending ? (
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button onClick={() => handleApprove(u)} style={{ padding: "6px 12px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>✅ Aprobar</button>
                <button onClick={() => handleReject(u)} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>❌</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(u)} title="Editar" style={btnStyle("#6366f1")}>✏️</button>
                {u.role !== "superadmin" && <button onClick={() => { setShowTransfer(u); setTransferBranchId(""); }} title="Transferir" style={btnStyle("#10b981")}>🔄</button>}
                {u.role !== "superadmin" && <button onClick={() => handleSuspend(u)} title={isSuspended ? "Reactivar" : "Suspender"} style={btnStyle(isSuspended ? "#10b981" : "#f59e0b")}>{isSuspended ? "✅" : "⛔"}</button>}
                <button onClick={() => handleDelete(u)} title="Eliminar" style={btnStyle("#ef4444")}>🗑️</button>
              </div>
            )}
          </div>
          {/* Row 2: badges */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.color, padding: "2px 8px", borderRadius: 6, background: `${r.color}12`, border: `1px solid ${r.color}22`, whiteSpace: "nowrap" }}>{r.icon} {r.label}</span>
            {u.branch && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 6, background: "var(--bg-tertiary)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>🏢 {u.branch.name}</span>}
            {isSuspended && <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", whiteSpace: "nowrap" }}>⛔ Suspendido</span>}
          </div>
          {/* Row 3: phone */}
          {u.phone && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📱 {u.phone}</div>}
        </div>
      </div>
    );
  };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        .sidebar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted);transition:all .15s;text-align:left}
        .sidebar-btn:hover{background:rgba(99,102,241,.06);color:var(--text-secondary)}
        .sidebar-btn.active{background:rgba(99,102,241,.12);color:#818cf8}
        .sidebar-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .form-input{width:100%;padding:10px 14px;background:rgba(22,22,31,.8);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:13px;outline:none}
        .form-input:focus{border-color:#6366f1}
        @media(max-width:768px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{margin-left:0!important;padding-top:72px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          .users-grid{grid-template-columns:1fr!important}
        }
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
          {branches.length > 0 && (
            <div style={{ padding: "0 6px 8px" }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "block" }}>🏢 Sucursal</label>
              <select value={activeBranch} onChange={(e) => { setActiveBranchState(e.target.value); setActiveBranchId(e.target.value); }} style={{ width: "100%", padding: "8px 10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "#eeeef2", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                {branches.map(b => <option key={b.id} value={b.id} style={{ background: "#111118" }}>{b.name}</option>)}
              </select>
            </div>
          )}
          {[{ label: "Panel Principal", path: "/dashboard", icon: "📋" }, { label: "Servicios", path: "/services", icon: "🛠️" }, { label: "Inventario", path: "/inventory", icon: "📦" }, { label: "Software", path: "/software", icon: "🎮" }, { label: "Escáner", path: "/scanner", icon: "📷" }, { label: "Cotizaciones", path: "/quotations", icon: "🧾" }, { label: "Extracto", path: "/extracto", icon: "📊" }, { label: "Usuarios", path: "/admin/users", icon: "👥", active: true }, { label: "Sucursales", path: "/admin/branches", icon: "🏢" }, { label: "Configuración", path: "/admin/settings", icon: "⚙️" }].map((item) => (
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>👥 Gestión de Usuarios</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {users.length} usuarios{pendingUsers.length > 0 && <span style={{ color: "#f59e0b", fontWeight: 700 }}> • {pendingUsers.length} pendiente{pendingUsers.length > 1 ? "s" : ""}</span>}
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>＋ Nuevo Usuario</button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Buscar..." style={{ flex: 1, minWidth: 180, padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
          {["all", "superadmin", "admin", "tech"].map(r => (
            <button key={r} onClick={() => setFilterRole(r)} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid", borderColor: filterRole === r ? "#6366f1" : "var(--border)", background: filterRole === r ? "rgba(99,102,241,0.12)" : "var(--bg-card)", color: filterRole === r ? "#818cf8" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {r === "all" ? "Todos" : ROLE_LABELS[r]?.label || r}
            </button>
          ))}
        </div>

        {/* Pending Section */}
        {pendingUsers.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>Solicitudes Pendientes</h2>
              <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>{pendingUsers.length}</span>
            </div>
            <div className="users-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
              {pendingUsers.map(u => <UserCard key={u.id} u={u} isPending />)}
            </div>
          </div>
        )}

        {/* Active Users */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Cargando...</div>
        ) : (
          <div className="users-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {activeUsers.map(u => <UserCard key={u.id} u={u} />)}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setShowForm(false); resetForm(); }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", padding: "28px 24px", maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editId ? "✏️ Editar Usuario" : "➕ Nuevo Usuario"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Nombre</label>
                <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Correo</label>
                <input className="form-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{editId ? "Nueva Contraseña (vacío = mantener)" : "Contraseña"}</label>
                <input className="form-input" type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Teléfono</label>
                <input className="form-input" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>📸 Foto</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: formImagePreview ? "#000" : "rgba(99,102,241,0.08)", border: "2px dashed rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {formImagePreview ? <img src={formImagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>👤</span>}
                  </div>
                  <label style={{ padding: "7px 14px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {uploadingImg ? "..." : formImagePreview ? "Cambiar" : "Subir"}
                    <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} style={{ display: "none" }} />
                  </label>
                  {formImagePreview && <button type="button" onClick={() => { setFormImage(""); setFormImagePreview(""); }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>✕</button>}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Rol</label>
                <select className="form-input" value={formRole} onChange={e => setFormRole(e.target.value)}>
                  <option value="superadmin">⭐ Super Admin</option>
                  <option value="admin">👤 Administrador</option>
                  <option value="tech">🔧 Técnico</option>
                </select>
              </div>
              {(formRole === "admin" || formRole === "tech") && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Sucursal *</label>
                  <select className="form-input" value={formBranchId} onChange={e => setFormBranchId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{editId ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowTransfer(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: "100%", background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", padding: "28px 24px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🔄 Transferir Usuario</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Mover a <strong style={{ color: "var(--text-primary)" }}>{showTransfer.name}</strong> a otra sucursal</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 14px", background: "var(--bg-tertiary)", borderRadius: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {showTransfer.image ? <img src={showTransfer.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, fontWeight: 800, color: "#818cf8" }}>{showTransfer.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{showTransfer.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Actual: {showTransfer.branch?.name || "Sin sucursal"}</div>
              </div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Nueva sucursal</label>
            <select className="form-input" value={transferBranchId} onChange={e => setTransferBranchId(e.target.value)} style={{ marginBottom: 20 }}>
              <option value="">Seleccionar...</option>
              {branches.filter(b => b.id !== showTransfer.branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowTransfer(null)} style={{ flex: 1, padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleTransfer} disabled={!transferBranchId} style={{ flex: 1, padding: "12px", background: transferBranchId ? "linear-gradient(135deg, #10b981, #059669)" : "var(--bg-tertiary)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: transferBranchId ? "pointer" : "not-allowed", opacity: transferBranchId ? 1 : 0.5 }}>🔄 Transferir</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
    </div>
  );
}

const btnStyle = (color: string): React.CSSProperties => ({
  width: 26, height: 26, borderRadius: 6, background: `${color}12`, border: `1px solid ${color}22`,
  color, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
});
