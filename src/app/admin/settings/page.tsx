"use client";
import { sileo } from "@/lib/toast";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";

interface Settings { id: string; companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null; website: string | null; }

export default function AdminSettingsPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({"catalogo": false, "documentos": false, "admin": true, "recepcion": false});
  const toggleMenu = (key: string) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [activeBranch, setActiveBranchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("user"); const token = sessionStorage.getItem("token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);

    // Load branches for sidebar
    apiFetch("/api/branches").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) {
        setBranches(d.map((b: any) => ({ id: b.id, name: b.name })));
        const ab = sessionStorage.getItem("activeBranchId");
        if (ab) setActiveBranchState(ab);
        else if (d.length > 0) { setActiveBranchState(d[0].id); setActiveBranchId(d[0].id); }
      }
    });

    // Load settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const s: Settings = await res.json();
        setCompanyName(s.companyName);
        setSlogan(s.slogan);
        setLogo(s.logo);
        setPhone(s.phone || "");
        setEmail(s.email || "");
        setAddress(s.address || "");
        setWebsite(s.website || "");
      }
    } catch {} finally { setLoading(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { sileo.error({ title: "La imagen no debe superar 2MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogo(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const resetDefaults = () => {
    setCompanyName("RepairTrackQR");
    setSlogan("Servicio Técnico Especializado");
    setLogo(null);
    setPhone("");
    setEmail("");
    setAddress("");
    setWebsite("");
    sileo.info({ title: "Valores por defecto restaurados — presiona Guardar para aplicar" });
  };

  const handleSave = async () => {
    if (!companyName.trim()) { sileo.error({ title: "El nombre de empresa es obligatorio" }); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName: companyName.trim(),
          slogan: slogan.trim(),
          logo,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          website: website.trim() || null,
        }),
      });
      if (res.ok) { sileo.success({ title: "Configuración guardada correctamente" }); }
      else { const d = await res.json(); sileo.error({ title: `${d.error}` }); }
    } catch { sileo.error({ title: "Error al guardar" }); }
    finally { setSaving(false); }
  };

  const logout = () => { apiFetch("/api/auth/logout", { method: "POST" }).then(() => { sessionStorage.removeItem("token"); sessionStorage.removeItem("user"); router.push("/"); }); };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  const inputStyle = { width: "100%", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(99,102,241,0.06); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(99,102,241,0.12); color: #818cf8; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        @media(max-width:1024px) {
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          .settings-main{margin-left:0!important;padding-top:70px!important}
          .settings-form-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* MOBILE HEADER */}
      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", alignItems: "center", padding: "0 16px", zIndex: 50, gap: 12 }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: "#818cf8" }}>{menuOpen ? "✕" : "☰"}</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{companyName || "Configuración"}</span>
      </div>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 44 }} />}

      {/* SIDEBAR */}
      <aside className={`sidebar-desktop${menuOpen ? " open" : ""}`} style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 200, transition: "transform 0.3s ease", background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 45, padding: "0 10px" }}>
        <div style={{ padding: "18px 14px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logo ? <img src={logo} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} /> : <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px rgba(99,102,241,0.2)", flexShrink: 0 }}>🔧</div>}
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>{companyName || "RepairTrackQR"}</span>
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
          <>
            {/* Standalone */}
            {/* Recepción */}
            <button className={`sidebar-group-btn${openMenus.recepcion ? " open" : ""}`} onClick={() => toggleMenu("recepcion")} style={{ background: "rgba(96,165,250,0.08)", borderLeft: "2px solid #60a5fa", color: "#60a5fa", borderRadius: "0 8px 8px 0" }}><span>📥 Recepción</span><span className="group-arrow" style={{ color: "#60a5fa" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.recepcion ? " open" : ""}`}>
            <button key="/dashboard" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/dashboard"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>📋</div>Panel Principal</button>
            <button key="/scanner" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/scanner"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>📷</div>Escáner</button>
            </div>
            {/* Catálogo */}
            <button className={`sidebar-group-btn${openMenus.catalogo ? " open" : ""}`} onClick={() => toggleMenu("catalogo")} style={{ background: "rgba(251,191,36,0.08)", borderLeft: "2px solid #fbbf24", color: "#fbbf24", borderRadius: "0 8px 8px 0" }}><span>📂 Catálogo</span><span className="group-arrow" style={{ color: "#fbbf24" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.catalogo ? " open" : ""}`}>
            <button key="/services" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/services"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🛠️</div>Servicios</button>
            <button key="/inventory" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/inventory"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>📦</div>Inventario</button>
            <button key="/equipment" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/equipment"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>💻</div>Equipos</button>
            <button key="/software" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/software"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>💿</div>Programas</button>
            <button key="/videogames" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/videogames"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🎮</div>Videojuegos</button>
            <button key="/consoles" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/consoles"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🕹️</div>Consolas</button>
            </div>
            {/* Documentos */}
            <button className={`sidebar-group-btn${openMenus.documentos ? " open" : ""}`} onClick={() => toggleMenu("documentos")} style={{ background: "rgba(52,211,153,0.08)", borderLeft: "2px solid #34d399", color: "#34d399", borderRadius: "0 8px 8px 0" }}><span>📄 Documentos</span><span className="group-arrow" style={{ color: "#34d399" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.documentos ? " open" : ""}`}>
            <button key="/quotations" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/quotations"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🧾</div>Cotizaciones</button>
            <button key="/extracto" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/extracto"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>📊</div>Extracto</button>
            <button key="/certificates" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/certificates"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🏅</div>Certificados</button>
            </div>
            {/* Administración */}
            {user?.role === "superadmin" && (<>
            <button className={`sidebar-group-btn${openMenus.admin ? " open" : ""}`} onClick={() => toggleMenu("admin")} style={{ background: "rgba(248,113,113,0.08)", borderLeft: "2px solid #f87171", color: "#f87171", borderRadius: "0 8px 8px 0" }}><span>⚙️ Administración</span><span className="group-arrow" style={{ color: "#f87171" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.admin ? " open" : ""}`}>
            <button key="/admin/users" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/admin/users"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>👥</div>Usuarios</button>
            <button key="/admin/branches" className={`sidebar-btn sidebar-sub${false ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/admin/branches"); }}><div className="sidebar-icon" style={{ background: false ? "rgba(99,102,241,0.15)" : "transparent" }}>🏢</div>Sucursales</button>
            <button key="/admin/settings" className={`sidebar-btn sidebar-sub${true ? " active" : ""}`} onClick={() => { setMenuOpen(false); router.push("/admin/settings"); }}><div className="sidebar-icon" style={{ background: true ? "rgba(99,102,241,0.15)" : "transparent" }}>⚙️</div>Configuración</button>
            </div>
            </>)}
            </>
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 6px" }}>
          <div style={{ padding: "14px 10px", marginBottom: 8, background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.08)", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 auto 8px", boxShadow: "0 4px 14px rgba(99,102,241,0.3)", overflow: "hidden", letterSpacing: "-0.5px" }}>
              {user?.name ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "?"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, wordBreak: "break-word", marginBottom: 6 }}>{user?.name}</div>
            <div style={{ display: "inline-block", fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 10px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>⭐ Super Admin</div>
          </div>
          <button onClick={logout} style={{ width: "100%", padding: "9px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>🚪 Cerrar Sesión</button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="settings-main" style={{ marginLeft: 200, padding: "32px 28px", minHeight: "100vh" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px" }}>⚙️ Configuración de Empresa</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Personaliza el nombre, logo y datos de contacto. Estos datos se reflejan en todo el sistema: login, impresiones, seguimiento, cotizaciones y más.</p>
          </div>

          {/* LOGO SECTION */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>Logo de la Empresa</label>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 100, height: 100, borderRadius: 16, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--bg-tertiary)", flexShrink: 0, cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                {logo ? (
                  <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 28 }}>🖼️</div>
                    <div style={{ fontSize: 9, marginTop: 4 }}>Click para subir</div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" ref={fileRef} accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 6, display: "block" }}>📁 Subir imagen</button>
                {logo && <button onClick={() => setLogo(null)} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>🗑️ Quitar logo</button>}
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>PNG, JPG o SVG. Máximo 2MB. Se muestra en login, impresiones y documentos.</p>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>Datos de la Empresa</label>
            <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Nombre de la Empresa *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ej: TechFix Bolivia" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Slogan / Descripción</label>
                <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Ej: Servicio Técnico Especializado" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 71234567" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: info@techfix.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Dirección</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Av. Principal #123" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Sitio Web (para impresiones)</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Ej: www.techfix.com" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>👁️ Vista Previa</label>
            <div style={{ padding: 20, background: "#fff", borderRadius: 10, color: "#111" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {logo ? (
                  <img src={logo} alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff" }}>🔧</div>
                )}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1a1a2e" }}>{companyName || "Nombre de Empresa"}</h3>
                  <p style={{ fontSize: 9, color: "#888", margin: 0, marginTop: 1, textTransform: "uppercase", letterSpacing: "0.5px" }}>{slogan || "Slogan"}</p>
                </div>
              </div>
              <div style={{ height: 2, background: "linear-gradient(90deg, #1a1a2e, #6366f1, #a5b4fc, transparent)", borderRadius: 1, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 16, fontSize: 9, color: "#888" }}>
                {phone && <span>📞 {phone}</span>}
                {email && <span>✉️ {email}</span>}
                {address && <span>📍 {address}</span>}
                {website && <span>🌐 {website}</span>}
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={resetDefaults} style={{ flex: "0 0 auto", padding: "14px 24px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, color: "#f59e0b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔄 Default</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: saving ? "var(--bg-tertiary)" : "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "⏳ Guardando..." : "💾 Guardar Configuración"}
            </button>
          </div>
        </div>
      </main>

      {/* TOAST */}
</div>
  );
}
