"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => setMounted(true), []);
  useEffect(() => { fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {}); }, []);

  const SECRET_CODE = "RTQR-2026";

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

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === SECRET_CODE) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Código de acceso incorrecto");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);

    if (mode === "register") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role: "superadmin", phone: phone || null, image: imageUrl || null }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al registrar"); setLoading(false); return; }
        setSuccess("✅ Super Admin creado. Ahora inicia sesión.");
        setMode("login");
        setName(""); setPhone("");
      } catch { setError("Error de conexión"); }
    } else {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-from": "setup" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Error al iniciar sesión"); setLoading(false); return; }
        if (data.user.role !== "superadmin") {
          setError("Esta página es solo para Super Admins. Usa /login normal.");
          setLoading(false); return;
        }
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        try {
          const bRes = await fetch("/api/branches", { headers: { "Authorization": `Bearer ${data.token}` } });
          const branches = await bRes.json();
          if (branches.length > 0) sessionStorage.setItem("activeBranchId", branches[0].id);
        } catch {}
        router.push("/dashboard");
      } catch { setError("Error de conexión"); }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050507", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .setup-input { width: 100%; padding: 14px 16px; background: rgba(22,22,31,0.8); border: 1px solid rgba(46,46,62,0.5); border-radius: 12px; color: #eeeef2; font-size: 14px; outline: none; transition: all 0.3s; backdrop-filter: blur(10px); }
        .setup-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1), 0 0 20px rgba(245,158,11,0.05); }
        .setup-input::placeholder { color: #555568; }
      `}</style>

      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", top: "20%", left: "50%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)", animation: "pulse 6s ease-in-out infinite", transform: "translateX(-50%)" }} />
      </div>

      <div style={{
        maxWidth: 460, width: "90%", padding: "36px 28px", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, rgba(17,17,24,0.92), rgba(8,8,12,0.95))",
        borderRadius: 28, border: "1px solid rgba(245,158,11,0.12)",
        boxShadow: "0 0 100px rgba(245,158,11,0.04), 0 25px 70px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)" }} />

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 18px",
            background: "linear-gradient(135deg, #f59e0b, #d97706, #f59e0b)",
            backgroundSize: "200% 200%", animation: "gradientShift 4s ease-in-out infinite",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            boxShadow: "0 0 50px rgba(245,158,11,0.3), 0 0 100px rgba(245,158,11,0.1)",
          }}>
            ⭐
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {settings.companyName}
          </h1>
          <p style={{ color: "#555568", fontSize: 12, marginTop: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
            Panel Super Administrador
          </p>
        </div>

        {!unlocked ? (
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {error && (
              <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 6, display: "block", letterSpacing: "0.5px" }}>🔐 Código de Acceso</label>
              <input className="setup-input" type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Ingresa el código secreto" required />
              <p style={{ fontSize: 10, color: "#555568", marginTop: 6 }}>Contacta al desarrollador si no tienes el código</p>
            </div>
            <button type="submit" style={{
              padding: "14px", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer",
              background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000",
              boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
            }}>
              Desbloquear
            </button>
          </form>
        ) : (
          <>
            {/* Toggle */}
            <div style={{ display: "flex", background: "rgba(5,5,7,0.6)", borderRadius: 14, padding: 4, marginBottom: 24, border: "1px solid rgba(245,158,11,0.1)" }}>
              {["Iniciar Sesión", "Registrar Super Admin"].map((label, i) => {
                const active = i === 0 ? mode === "login" : mode === "register";
                return (
                  <button key={i} onClick={() => { setMode(i === 0 ? "login" : "register"); setError(""); setSuccess(""); }} style={{
                    flex: 1, padding: "12px", borderRadius: 11, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: active ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))" : "transparent",
                    color: active ? "#f59e0b" : "#555568", transition: "all 0.3s",
                  }}>{label}</button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {error && (
                <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: "12px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, color: "#10b981", fontSize: 13, fontWeight: 500 }}>
                  {success}
                </div>
              )}

              {mode === "register" && (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, display: "block" }}>Nombre completo</label>
                    <input className="setup-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, display: "block" }}>Teléfono (opcional)</label>
                    <input className="setup-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="71234567" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, display: "block" }}>📸 Foto de perfil (opcional)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: imagePreview ? "transparent" : "rgba(245,158,11,0.1)", border: "2px dashed rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {imagePreview ? <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>⭐</span>}
                      </div>
                      <div>
                        <label style={{ display: "inline-block", padding: "8px 16px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {uploading ? "Subiendo..." : imagePreview ? "Cambiar" : "Subir foto"}
                          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} style={{ display: "none" }} />
                        </label>
                        {imagePreview && <button type="button" onClick={() => { setImageUrl(""); setImagePreview(""); }} style={{ marginLeft: 8, background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>✕</button>}
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, display: "block" }}>Correo electrónico</label>
                <input className="setup-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, display: "block" }}>Contraseña</label>
                <input className="setup-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: "14px", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer",
                background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000",
                boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Procesando..." : mode === "register" ? "⭐ Crear Super Admin" : "Iniciar Sesión"}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#555568", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            ← Volver al login normal
          </button>
        </div>
      </div>
    </div>
  );
}
