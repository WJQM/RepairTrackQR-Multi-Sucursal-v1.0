"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, setActiveBranchId } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ConsoleItem {
  id: string;
  code: string;
  name: string;
  category: string | null;
  state: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  storage: string | null;
  generation: string | null;
  accessories: string | null;
  condition: string;
  price: number;
  notes: string | null;
  image: string | null;
  active: boolean;
}

const INITIAL_CATEGORIES = ["Nintendo", "Sony", "Microsoft"];
const STATES = ["", "Nueva", "Usada"];
const CONDITIONS: Record<string, { label: string; icon: string; color: string }> = {
  disponible: { label: "Disponible", icon: "✅", color: "#10b981" },
  vendida: { label: "Vendida", icon: "💰", color: "#6366f1" },
  reservada: { label: "Reservada", icon: "🔖", color: "#f59e0b" },
};

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr; } catch {}
  return img.trim() ? [img] : [];
}

export default function ConsolesPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ catalogo: true, documentos: false, admin: false, recepcion: false });
  const toggleMenu = (key: string) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [items, setItems] = useState<ConsoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [storage, setStorage] = useState("");
  const [generation, setGeneration] = useState("");
  const [accessories, setAccessories] = useState("");
  const [condition, setCondition] = useState("disponible");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    try { const res = await apiFetch("/api/consoles"); if (res.ok) setItems(await res.json()); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "admin" && parsed.role !== "superadmin") { router.push("/dashboard"); return; }
    setUser(parsed);
    if (parsed.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => {
        if (Array.isArray(b)) {
          setBranches(b);
          const ab = sessionStorage.getItem("activeBranchId");
          if (ab) setActiveBranch(ab);
          else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); }
        }
      }).catch(() => {});
    } else { setActiveBranch(parsed.branchId || ""); }

    loadItems();
    const saved = sessionStorage.getItem("consoleCategories");
    if (saved) try { setCategories(JSON.parse(saved)); } catch {}

    const savedForm = sessionStorage.getItem("consoleFormData");
    if (savedForm) {
      try {
        const d = JSON.parse(savedForm);
        setEditingId(d.editingId || null); setName(d.name || ""); setCategory(d.category || "");
        setState(d.state || ""); setBrand(d.brand || ""); setModel(d.model || "");
        setColor(d.color || ""); setStorage(d.storage || ""); setGeneration(d.generation || "");
        setAccessories(d.accessories || ""); setCondition(d.condition || "disponible");
        setPrice(d.price || ""); setNotes(d.notes || "");
        setImageUrls(d.imageUrls || []); setImagePreviews(d.imagePreviews || []);
        setShowForm(true);
      } catch {}
      sessionStorage.removeItem("consoleFormData");
    }

    const capturedData = sessionStorage.getItem("capturedImage");
    if (capturedData) {
      try {
        const { url, preview } = JSON.parse(capturedData);
        setImageUrls(prev => [...prev, url]); setImagePreviews(prev => [...prev, preview]);
        setShowForm(true);
        setTimeout(() => sileo.success({ title: "Foto capturada" }), 500);
      } catch {}
      sessionStorage.removeItem("capturedImage");
    }
  }, []);

  const saveCategories = (cats: string[]) => { setCategories(cats); sessionStorage.setItem("consoleCategories", JSON.stringify(cats)); };
  const addCategory = () => {
    const t = newCategoryName.trim(); if (!t) return;
    if (categories.includes(t)) { sileo.error({ title: "Ya existe" }); return; }
    saveCategories([...categories, t]); setNewCategoryName(""); sileo.success({ title: `"${t}" creada` });
  };
  const deleteCategory = (idx: number) => {
    const c = categories[idx];
    if (!confirm(`¿Eliminar "${c}"?`)) return;
    saveCategories(categories.filter((_, i) => i !== idx));
    if (filterCategory === c) setFilterCategory("all");
    sileo.success({ title: `"${c}" eliminada` });
  };
  const saveEditCategory = (idx: number) => {
    const t = editingCatName.trim();
    if (!t || t === categories[idx]) { setEditingCatIdx(null); return; }
    if (categories.includes(t)) { sileo.error({ title: "Ya existe" }); return; }
    const old = categories[idx]; const u = [...categories]; u[idx] = t;
    saveCategories(u);
    if (filterCategory === old) setFilterCategory(t);
    setEditingCatIdx(null);
    sileo.success({ title: "Renombrada" });
  };

  const resetForm = () => {
    setName(""); setCategory(""); setState(""); setBrand(""); setModel(""); setColor("");
    setStorage(""); setGeneration(""); setAccessories(""); setCondition("disponible");
    setPrice(""); setNotes(""); setImageUrls([]); setImagePreviews([]);
    setEditingId(null); setShowForm(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
      const formData = new FormData(); formData.append("file", file);
      try {
        const res = await apiFetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) { const data = await res.json(); setImageUrls(prev => [...prev, data.url]); }
      } catch {}
    }
    sileo.success({ title: `${files.length} imagen${files.length > 1 ? "es subidas" : " subida"}` });
    setUploading(false);
    e.target.value = "";
  };

  const handleTakePhoto = () => {
    sessionStorage.setItem("consoleFormData", JSON.stringify({
      editingId, name, category, state, brand, model, color, storage, generation,
      accessories, condition, price, notes, imageUrls, imagePreviews,
    }));
    sessionStorage.setItem("cameraReturnUrl", "/consoles");
    window.location.href = "/camera.html";
  };

  const removeImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const saveItem = async () => {
    const token = sessionStorage.getItem("token"); if (!token) return;
    if (!name.trim()) { sileo.error({ title: "Nombre es requerido" }); return; }
    const imageData = imageUrls.length > 1 ? JSON.stringify(imageUrls) : imageUrls[0] || null;
    const payload = {
      name: name.trim(),
      category: category || null,
      state: state || null,
      brand: brand.trim() || null,
      model: model.trim() || null,
      color: color.trim() || null,
      storage: storage.trim() || null,
      generation: generation.trim() || null,
      accessories: accessories.trim() || null,
      condition,
      price: parseFloat(price) || 0,
      notes: notes.trim() || null,
      image: imageData,
    };
    try {
      if (editingId) {
        const res = await apiFetch("/api/consoles", { method: "PATCH", body: JSON.stringify({ id: editingId, ...payload }) });
        if (res.ok) { sileo.success({ title: "Actualizada" }); resetForm(); loadItems(); }
      } else {
        const res = await apiFetch("/api/consoles", { method: "POST", body: JSON.stringify(payload) });
        if (res.ok) { sileo.success({ title: "Agregada" }); resetForm(); loadItems(); }
      }
    } catch { sileo.error({ title: "Error" }); }
  };

  const editItem = (item: ConsoleItem) => {
    setEditingId(item.id);
    setName(item.name); setCategory(item.category || ""); setState(item.state || "");
    setBrand(item.brand || ""); setModel(item.model || ""); setColor(item.color || "");
    setStorage(item.storage || ""); setGeneration(item.generation || "");
    setAccessories(item.accessories || ""); setCondition(item.condition);
    setPrice(String(item.price || "")); setNotes(item.notes || "");
    const imgs = parseImages(item.image);
    setImageUrls(imgs); setImagePreviews(imgs);
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("¿Eliminar esta consola?")) return;
    const token = sessionStorage.getItem("token"); if (!token) return;
    try {
      const res = await apiFetch("/api/consoles", { method: "DELETE", body: JSON.stringify({ id }) });
      if (res.ok) { sileo.success({ title: "Eliminada" }); loadItems(); }
    } catch {}
  };

  const printQR = (item: ConsoleItem) => {
    const bid = activeBranch ? `?branchId=${activeBranch}` : "";
    window.open(`/consoles/print/${item.id}${bid}`, "_blank");
  };

  const filteredItems = items.filter(item => {
    const matchSearch = searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.model || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    const matchCondition = filterCondition === "all" || item.condition === filterCondition;
    return matchSearch && matchCategory && matchCondition;
  });

  const usedCategories = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];

  const getCategoryColor = (cat: string | null): string => {
    if (!cat) return "#6b7280";
    const map: Record<string, string> = { "Nintendo": "#ef4444", "Sony": "#3b82f6", "Microsoft": "#10b981", "Sega": "#8b5cf6", "Retro": "#f59e0b", "Atari": "#ec4899" };
    return map[cat] || "#6366f1";
  };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  const PRIMARY = "#f97316"; // naranja — distintivo de Consolas
  const PRIMARY_DARK = "#ea580c";

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 200, paddingTop: 0 }}>
      {viewImage && (
        <div onClick={() => setViewImage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, cursor: "pointer" }}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
            <img src={viewImage} alt="Consola" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
            <button onClick={() => setViewImage(null)} style={{ position: "absolute", top: -14, right: -14, width: 32, height: 32, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(80px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(99,102,241,0.06); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(99,102,241,0.12); color: #818cf8; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          [style*="grid-template-columns"]{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>

      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", alignItems: "center", padding: "0 16px", zIndex: 50, gap: 12 }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: "#818cf8" }}>{menuOpen ? "✕" : "☰"}</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{settings.companyName}</span>
      </div>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 44 }} />}

      <aside className={`sidebar-desktop${menuOpen ? " open" : ""}`} style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 200, transition: "transform 0.3s ease", background: "rgba(12,12,18,0.95)", backdropFilter: "blur(20px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 45, padding: "0 10px" }}>
        <div style={{ padding: "18px 14px 20px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {settings.logo ? <img src={settings.logo} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} /> : <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px rgba(99,102,241,0.2)", flexShrink: 0 }}>🔧</div>}
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>{settings.companyName}</span>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflow: "auto", padding: "4px 0" }}>
          {user?.role === "superadmin" && branches.length > 0 && (
            <div style={{ padding: "0 6px 12px", borderBottom: "1px solid rgba(99,102,241,0.1)", marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>🏢 Sucursal activa</div>
              <div style={{ position: "relative" }}>
                <select value={activeBranch} onChange={(e) => { setActiveBranch(e.target.value); setActiveBranchId(e.target.value); window.location.reload(); }} style={{ width: "100%", padding: "9px 28px 9px 12px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderLeft: "2px solid #6366f1", borderRadius: "0 10px 10px 0", color: "#c7d2fe", fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  {branches.map(b => <option key={b.id} value={b.id} style={{ background: "#111118", color: "#eeeef2" }}>{b.name}</option>)}
                </select>
                <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#6366f1", fontSize: 10, pointerEvents: "none" }}>▾</span>
              </div>
            </div>
          )}
          <>
            <button className={`sidebar-group-btn${openMenus.recepcion ? " open" : ""}`} onClick={() => toggleMenu("recepcion")} style={{ background: "rgba(96,165,250,0.08)", borderLeft: "2px solid #60a5fa", color: "#60a5fa", borderRadius: "0 8px 8px 0" }}><span>📥 Recepción</span><span className="group-arrow" style={{ color: "#60a5fa" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.recepcion ? " open" : ""}`}>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/dashboard"); }}><div className="sidebar-icon">📋</div>Panel Principal</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/scanner"); }}><div className="sidebar-icon">📷</div>Escáner</button>
            </div>
            <button className={`sidebar-group-btn${openMenus.catalogo ? " open" : ""}`} onClick={() => toggleMenu("catalogo")} style={{ background: "rgba(251,191,36,0.08)", borderLeft: "2px solid #fbbf24", color: "#fbbf24", borderRadius: "0 8px 8px 0" }}><span>📂 Catálogo</span><span className="group-arrow" style={{ color: "#fbbf24" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.catalogo ? " open" : ""}`}>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/services"); }}><div className="sidebar-icon">🛠️</div>Servicios</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/inventory"); }}><div className="sidebar-icon">📦</div>Inventario</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/equipment"); }}><div className="sidebar-icon">💻</div>Equipos</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/software"); }}><div className="sidebar-icon">💿</div>Programas</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/videogames"); }}><div className="sidebar-icon">🎮</div>Videojuegos</button>
              <button className="sidebar-btn sidebar-sub active" onClick={() => { setMenuOpen(false); router.push("/consoles"); }}><div className="sidebar-icon" style={{ background: "rgba(99,102,241,0.15)" }}>🕹️</div>Consolas</button>
            </div>
            <button className={`sidebar-group-btn${openMenus.documentos ? " open" : ""}`} onClick={() => toggleMenu("documentos")} style={{ background: "rgba(52,211,153,0.08)", borderLeft: "2px solid #34d399", color: "#34d399", borderRadius: "0 8px 8px 0" }}><span>📄 Documentos</span><span className="group-arrow" style={{ color: "#34d399" }}>▾</span></button>
            <div className={`sidebar-sub-list${openMenus.documentos ? " open" : ""}`}>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/quotations"); }}><div className="sidebar-icon">🧾</div>Cotizaciones</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/extracto"); }}><div className="sidebar-icon">📊</div>Extracto</button>
              <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/certificates"); }}><div className="sidebar-icon">🏅</div>Certificados</button>
            </div>
            {user?.role === "superadmin" && (<>
              <button className={`sidebar-group-btn${openMenus.admin ? " open" : ""}`} onClick={() => toggleMenu("admin")} style={{ background: "rgba(248,113,113,0.08)", borderLeft: "2px solid #f87171", color: "#f87171", borderRadius: "0 8px 8px 0" }}><span>⚙️ Administración</span><span className="group-arrow" style={{ color: "#f87171" }}>▾</span></button>
              <div className={`sidebar-sub-list${openMenus.admin ? " open" : ""}`}>
                <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/admin/users"); }}><div className="sidebar-icon">👥</div>Usuarios</button>
                <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/admin/branches"); }}><div className="sidebar-icon">🏢</div>Sucursales</button>
                <button className="sidebar-btn sidebar-sub" onClick={() => { setMenuOpen(false); router.push("/admin/settings"); }}><div className="sidebar-icon">⚙️</div>Configuración</button>
              </div>
            </>)}
          </>
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 6px" }}>
          <div style={{ padding: "14px 10px", marginBottom: 8, background: "rgba(99,102,241,0.04)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.08)", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 auto 8px", boxShadow: "0 4px 14px rgba(99,102,241,0.3)", overflow: "hidden", letterSpacing: "-0.5px" }}>
              {user?.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} /> : user?.name ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "?"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, wordBreak: "break-word", marginBottom: 6 }}>{user?.name}</div>
            <div style={{ display: "inline-block", fontSize: 9, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 10px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>{user?.role === "tech" ? "🔧 Técnico" : user?.role === "superadmin" ? "⭐ Super Admin" : "👤 Admin"}</div>
          </div>
          <button onClick={() => { apiFetch("/api/auth/logout", { method: "POST" }).then(() => { sessionStorage.removeItem("token"); sessionStorage.removeItem("user"); router.push("/"); }); }} style={{ width: "100%", padding: "9px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>🚪 Cerrar Sesión</button>
        </div>
      </aside>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Consolas", value: items.length, icon: "🕹️", color: PRIMARY },
            { label: "Disponibles", value: items.filter(i => i.condition === "disponible").length, icon: "✅", color: "#10b981" },
            { label: "Categorías", value: usedCategories.length, icon: "🏷️", color: "#8b5cf6" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "20px 18px", background: `linear-gradient(135deg, ${s.color}10, ${s.color}02)`, borderRadius: 16, border: `1px solid ${s.color}15`, animation: `fadeIn 0.4s ease-out ${i * 0.06}s both`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -10, right: -10, fontSize: 48, opacity: 0.06 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 8, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", borderRadius: 10, padding: "0 14px", border: "1px solid var(--border)", flex: 1, maxWidth: 260 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>🔍</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar consola..." style={{ border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" }} />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="all">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="all">Toda condición</option>
              <option value="disponible">✅ Disponible</option>
              <option value="reservada">🔖 Reservada</option>
              <option value="vendida">💰 Vendida</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCategoryPanel(!showCategoryPanel)} style={{ padding: "8px 14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, color: "#8b5cf6", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏷️ Categorías</button>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "8px 14px", background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>＋ Nueva</button>
          </div>
        </div>

        {showCategoryPanel && (
          <div style={{ padding: 20, background: "var(--bg-card)", borderRadius: 14, border: "1px solid rgba(139,92,246,0.15)", marginBottom: 20, animation: "fadeScale 0.2s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>🏷️ Gestión de Categorías</h3>
              <button onClick={() => setShowCategoryPanel(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="Nueva categoría..." style={{ flex: 1, padding: "9px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
              <button onClick={addCategory} style={{ padding: "9px 16px", background: "#8b5cf6", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>＋ Crear</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((cat, idx) => (
                <div key={idx} style={{ padding: "5px 10px", borderRadius: 8, background: `${getCategoryColor(cat)}18`, border: `1px solid ${getCategoryColor(cat)}30`, color: getCategoryColor(cat), fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  {editingCatIdx === idx ? (
                    <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditCategory(idx); if (e.key === "Escape") setEditingCatIdx(null); }} onBlur={() => saveEditCategory(idx)} autoFocus style={{ width: 110, padding: "2px 6px", background: "var(--bg-tertiary)", border: `1px solid ${getCategoryColor(cat)}`, borderRadius: 4, color: "var(--text-primary)", fontSize: 11, outline: "none" }} />
                  ) : (<>{cat}<span onClick={() => { setEditingCatIdx(idx); setEditingCatName(cat); }} style={{ cursor: "pointer", fontSize: 10 }}>✏️</span><span onClick={() => deleteCategory(idx)} style={{ cursor: "pointer", fontSize: 10, color: "#ef4444", fontWeight: 800 }}>✕</span></>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "auto", background: "var(--bg-card)", borderRadius: 20, border: `1px solid ${PRIMARY}40`, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "fadeScale 0.3s ease-out" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>{editingId ? "✏️ Editar Consola" : "＋ Nueva Consola"}</h3>
                <button onClick={resetForm} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>📷 Imágenes</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} style={{ width: 100, height: 100, borderRadius: 10, overflow: "hidden", position: "relative", border: `2px solid ${PRIMARY}`, flexShrink: 0 }}>
                        <img src={preview} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeImage(idx)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ))}
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 100, borderRadius: 10, border: "2px dashed var(--border)", background: "var(--bg-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 24 }}>📷</span><span style={{ fontSize: 9, color: "var(--text-muted)" }}>Subir</span></div>
                    <div onClick={handleTakePhoto} style={{ width: 100, height: 100, borderRadius: 10, border: "2px dashed rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}><span style={{ fontSize: 24 }}>📸</span><span style={{ fontSize: 9, color: "#10b981" }}>Cámara</span></div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: "none" }} />
                  </div>
                </div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Nombre *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Nintendo Switch OLED, PlayStation 5..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>🏷️ Categoría</label><select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}><option value="">Sin categoría</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label style={labelStyle}>✨ Estado</label><select value={state} onChange={(e) => setState(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>{STATES.map(s => <option key={s} value={s}>{s || "Sin especificar"}</option>)}</select></div>
                  <div><label style={labelStyle}>🏢 Marca</label><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Nintendo, Sony, Microsoft..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>📦 Modelo</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Switch OLED, PS5 Slim..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>🎨 Color</label><input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro, Blanco, Rojo..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>💾 Almacenamiento</label><input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="64GB, 825GB SSD..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>🎯 Generación</label><input value={generation} onChange={(e) => setGeneration(e.target.value)} placeholder="8va, 9na, Retro..." style={fieldStyle} /></div>
                  <div><label style={labelStyle}>📊 Condición</label><select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}><option value="disponible">✅ Disponible</option><option value="reservada">🔖 Reservada</option><option value="vendida">💰 Vendida</option></select></div>
                  <div><label style={labelStyle}>💰 Precio (Bs.)</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={fieldStyle} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>🎒 Accesorios incluidos</label><textarea value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="2 controles, cargador, juego incluido..." rows={2} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>📝 Notas</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones, detalles extras..." rows={2} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} /></div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={resetForm} style={{ padding: "10px 20px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                  <button onClick={saveItem} disabled={uploading} style={{ padding: "10px 24px", background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: uploading ? "wait" : "pointer", flex: 1 }}>{editingId ? "💾 Guardar" : "＋ Agregar"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg-card)", borderRadius: 18, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕹️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No hay consolas</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Agrega consolas Nintendo, Sony, Microsoft y más</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>＋ Agregar primera</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {filteredItems.map((item, i) => {
              const imgs = parseImages(item.image);
              const firstImg = imgs[0] || null;
              const catColor = getCategoryColor(item.category);
              const cond = CONDITIONS[item.condition] || CONDITIONS.disponible;
              return (
                <div key={item.id} style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`, position: "relative" }}>
                  {item.category && <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: `${catColor}dd`, color: "#fff", fontSize: 9, fontWeight: 700 }}>{item.category}</div>}
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: `${cond.color}dd`, color: "#fff", fontSize: 9, fontWeight: 700 }}>{cond.icon} {cond.label}</div>
                  {imgs.length > 1 && <div style={{ position: "absolute", top: 34, right: 10, zIndex: 2, padding: "2px 6px", borderRadius: 5, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, fontWeight: 700 }}>📷 {imgs.length}</div>}

                  <div onClick={() => firstImg && setViewImage(firstImg)} style={{ width: "100%", height: 180, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: firstImg ? "pointer" : "default" }}>
                    {firstImg ? (<img src={firstImg} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<span style={{ fontSize: 48, opacity: 0.15 }}>🕹️</span>)}
                  </div>

                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                      {item.code && <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800, color: PRIMARY, padding: "2px 6px", borderRadius: 5, background: `${PRIMARY}14`, border: `1px solid ${PRIMARY}25`, flexShrink: 0 }}>{item.code}</span>}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>Bs. {item.price.toFixed(2)}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                      {item.state && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: item.state === "Nueva" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", color: item.state === "Nueva" ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{item.state === "Nueva" ? "✨" : "🔄"} {item.state}</span>}
                      {item.storage && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: "rgba(99,102,241,0.1)", color: "#818cf8", fontWeight: 700 }}>💾 {item.storage}</span>}
                      {item.color && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: "rgba(139,92,246,0.1)", color: "#a78bfa", fontWeight: 700 }}>🎨 {item.color}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => printQR(item)} style={{ padding: "7px 10px", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, color: "#06b6d4", fontSize: 11, fontWeight: 600, cursor: "pointer" }} title="Imprimir QR">📱 QR</button>
                      <button onClick={() => editItem(item)} style={{ flex: 1, padding: "7px", background: `${PRIMARY}14`, border: `1px solid ${PRIMARY}25`, borderRadius: 8, color: PRIMARY, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️ Editar</button>
                      <button onClick={() => deleteItem(item.id)} style={{ padding: "7px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, outline: "none" };
