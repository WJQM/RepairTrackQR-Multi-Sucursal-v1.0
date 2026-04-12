"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("tech");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{id:string;name:string}[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null });

  const refreshSettings = () => { fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, slogan: d.slogan, logo: d.logo }); }).catch(() => {}); };

  useEffect(() => {
    setMounted(true);
    // If already logged in, redirect
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.role === "tech") { router.push("/asignaciones"); return; }
        router.push("/dashboard"); return;
      } catch {}
    }
    fetch("/api/branches", { headers: { "Content-Type": "application/json" } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setBranches(d); })
      .catch(() => {});
    refreshSettings();
  }, []);
  useEffect(() => { const interval = setInterval(refreshSettings, 30000); return () => clearInterval(interval); }, []);

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) { setImageUrl(data.url); setImagePreview(URL.createObjectURL(file)); }
    } catch {}
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!branchId) { setError("Selecciona una sucursal"); setLoading(false); return; }
        const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role, phone: phone || null, branchId, image: imageUrl || null }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al registrar"); setLoading(false); return; }
        setIsRegister(false); setError(""); alert("¡Cuenta creada! Tu solicitud está pendiente de aprobación por el administrador.");
      } else {
        const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error en la solicitud"); setLoading(false); return; }
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        if (data.user.role === "superadmin") {
          try {
            const bRes = await fetch("/api/branches", { headers: { "Authorization": `Bearer ${data.token}` } });
            const b = await bRes.json();
            if (b.length > 0) sessionStorage.setItem("activeBranchId", b[0].id);
          } catch {}
          router.push("/dashboard");
        } else if (data.user.role === "tech") {
          router.push("/asignaciones");
        } else {
          router.push("/dashboard");
        }
      }
    } catch { setError("Error de conexión al servidor"); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050507", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(2deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-input { width: 100%; padding: 14px 16px; background: rgba(22,22,31,0.8); border: 1px solid rgba(46,46,62,0.5); border-radius: 12px; color: #eeeef2; font-size: 14px; outline: none; transition: all 0.3s; backdrop-filter: blur(10px); }
        .login-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 0 20px rgba(99,102,241,0.05); }
        .login-input::placeholder { color: #555568; }
      `}</style>

      {/* Animated Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", top: "20%", left: "50%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)", animation: "pulse 6s ease-in-out infinite", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", top: "60%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)", animation: "pulse 8s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "30%", right: "15%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.05), transparent 70%)", animation: "pulse 7s ease-in-out infinite 1s" }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: 4 + i * 2, height: 4 + i * 2, borderRadius: "50%", background: i % 2 === 0 ? "rgba(99,102,241,0.3)" : "rgba(16,185,129,0.3)", top: `${15 + i * 14}%`, left: `${10 + i * 15}%`, animation: `float ${4 + i}s ease-in-out infinite ${i * 0.5}s` }} />
        ))}
      </div>

      {/* Card */}
      <div style={{
        maxWidth: 460, width: "90%", padding: "36px 28px", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, rgba(17,17,24,0.92), rgba(8,8,12,0.95))",
        borderRadius: 28, border: "1px solid rgba(99,102,241,0.08)",
        boxShadow: "0 0 100px rgba(99,102,241,0.04), 0 25px 70px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)" }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div onClick={() => { const next = tapCount + 1; if (next >= 5) { router.push("/setup"); return; } setTapCount(next); setTimeout(() => setTapCount(0), 2000); }} style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 18px", cursor: "pointer",
            ...(settings.logo
              ? { backgroundColor: "transparent" }
              : { backgroundImage: "linear-gradient(135deg, #6366f1, #7c3aed, #6366f1)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease-in-out infinite", boxShadow: "0 0 50px rgba(99,102,241,0.3), 0 0 100px rgba(99,102,241,0.1)" }
            ),
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            position: "relative", overflow: "hidden",
          }}>
            {settings.logo ? <img src={settings.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🔧"}
            {!settings.logo && <div style={{ position: "absolute", inset: -2, borderRadius: 24, border: "1px solid rgba(99,102,241,0.2)", animation: "pulse 3s ease-in-out infinite" }} />}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>
            {settings.companyName}
          </h1>
          <p style={{ color: "#555568", fontSize: 13, marginTop: 10, letterSpacing: "0.5px" }}>
            {settings.slogan}
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: "rgba(5,5,7,0.6)", borderRadius: 14, padding: 4, marginBottom: 30, border: "1px solid var(--border)" }}>
          {["Iniciar Sesión", "Registrarse"].map((label, i) => {
            const active = i === 0 ? !isRegister : isRegister;
            return (
              <button key={i} onClick={() => { setIsRegister(i === 1); setError(""); }} style={{
                flex: 1, padding: "12px", borderRadius: 11, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: active ? "linear-gradient(135deg, #6366f1, #7c3aed)" : "transparent",
                color: active ? "#fff" : "#555568",
                boxShadow: active ? "0 4px 12px rgba(99,102,241,0.25)" : "none",
                transition: "all 0.3s",
              }}>{label}</button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "13px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, color: "#ef4444", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {isRegister && (
            <>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input className="login-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" required />
              </div>
              <div>
                <label style={labelStyle}>📸 Foto de perfil (opcional)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: imagePreview ? "transparent" : "rgba(99,102,241,0.1)", border: "2px dashed rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "inline-block", padding: "8px 16px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {uploading ? "Subiendo..." : imagePreview ? "Cambiar foto" : "Subir foto"}
                      <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} style={{ display: "none" }} />
                    </label>
                    {imagePreview && <button type="button" onClick={() => { setImageUrl(""); setImagePreview(""); }} style={{ marginLeft: 8, background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>✕ Quitar</button>}
                  </div>
                </div>
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input className="login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {isRegister && (
            <>
              <div>
                <label style={labelStyle}>Teléfono (opcional)</label>
                <input className="login-input" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="71234567" />
              </div>

              <div>
                <label style={labelStyle}>Tipo de cuenta</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { val: "admin", emoji: "🛡️", label: "Administrador", desc: "Control total de su sucursal" },
                    { val: "tech", emoji: "🔧", label: "Técnico", desc: "Gestiona reparaciones asignadas" },
                  ].map((opt) => {
                    const active = role === opt.val;
                    return (
                      <button key={opt.val} type="button" onClick={() => setRole(opt.val)} style={{
                        flex: 1, padding: "16px 14px", borderRadius: 14,
                        border: `2px solid ${active ? "#6366f1" : "rgba(46,46,62,0.4)"}`,
                        background: active ? "rgba(99,102,241,0.06)" : "rgba(22,22,31,0.5)",
                        cursor: "pointer", textAlign: "left", transition: "all 0.25s",
                        boxShadow: active ? "0 0 20px rgba(99,102,241,0.08)" : "none",
                      }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.emoji}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#818cf8" : "var(--text-primary)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "#555568", marginTop: 3 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>🏢 Sucursal</label>
                <select className="login-input" value={branchId} onChange={(e) => setBranchId(e.target.value)} required style={{ cursor: "pointer" }}>
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "15px", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700,
            cursor: loading ? "wait" : "pointer", marginTop: 6, letterSpacing: "0.3px", position: "relative", overflow: "hidden",
            background: loading ? "rgba(22,22,31,0.8)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
            color: "#fff",
            boxShadow: loading ? "none" : "0 6px 24px rgba(99,102,241,0.35), 0 0 60px rgba(99,102,241,0.1)",
          }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                Procesando...
              </span>
            ) : isRegister ? "Crear Cuenta" : "Ingresar al Sistema"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          {!isRegister ? (
            <p style={{ fontSize: 13, color: "#555568" }}>
              ¿No tienes cuenta?{" "}
              <span onClick={() => setIsRegister(true)} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 600, transition: "color 0.2s" }}>Regístrate</span>
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "#555568" }}>
              ¿Ya tienes cuenta?{" "}
              <span onClick={() => setIsRegister(false)} style={{ color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>Inicia sesión</span>
            </p>
          )}
        </div>

        <div style={{ position: "absolute", bottom: -1, left: "30%", right: "30%", height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)" }} />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#8888a0",
  marginBottom: 8, letterSpacing: "0.3px",
};
