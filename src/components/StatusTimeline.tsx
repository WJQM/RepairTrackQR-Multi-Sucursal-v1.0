"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface HistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  changedByName: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳" },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6", icon: "🔍" },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦" },
  in_progress: { label: "En Progreso", color: "#3b82f6", icon: "🔧" },
  completed: { label: "Completado", color: "#10b981", icon: "✅" },
  delivered: { label: "Entregado", color: "#6b7280", icon: "📬" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (mins > 0) return `hace ${mins}min`;
  return "hace un momento";
}

export function StatusTimeline({ repairId }: { repairId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    apiFetch(`/api/repairs/${repairId}/history`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => { setHistory(data.history || []); })
      .catch(() => setError("No se pudo cargar el historial"))
      .finally(() => setLoading(false));
  }, [repairId]);

  if (loading) {
    return <div style={{ padding: "12px 10px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Cargando historial...</div>;
  }
  if (error) {
    return <div style={{ padding: "12px 10px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{error}</div>;
  }
  if (history.length === 0) {
    return <div style={{ padding: "12px 10px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Sin cambios registrados todavía</div>;
  }

  return (
    <div>
      <div style={{ position: "relative", paddingLeft: 18 }}>
        {/* Línea vertical */}
        <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: "var(--border)" }} />
        {history.map((h, idx) => {
          const toMeta = STATUS_META[h.toStatus] || { label: h.toStatus, color: "#94a3b8", icon: "•" };
          const fromMeta = h.fromStatus ? (STATUS_META[h.fromStatus] || { label: h.fromStatus, color: "#94a3b8", icon: "•" }) : null;
          const isLast = idx === history.length - 1;
          return (
            <div key={h.id} style={{ position: "relative", paddingBottom: isLast ? 0 : 12 }}>
              {/* Punto en la línea */}
              <div style={{ position: "absolute", left: -18, top: 2, width: 12, height: 12, borderRadius: "50%", background: toMeta.color, border: "2px solid var(--bg-card)", boxShadow: `0 0 0 2px ${toMeta.color}30` }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {fromMeta ? (
                    <>
                      <span style={{ color: fromMeta.color, opacity: 0.7 }}>{fromMeta.icon} {fromMeta.label}</span>
                      <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>→</span>
                      <span style={{ color: toMeta.color, fontWeight: 700 }}>{toMeta.icon} {toMeta.label}</span>
                    </>
                  ) : (
                    <span style={{ color: toMeta.color, fontWeight: 700 }}>{toMeta.icon} {toMeta.label}</span>
                  )}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {h.changedByName && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    👤 <strong style={{ color: "var(--text-secondary)" }}>{h.changedByName}</strong>
                  </span>
                )}
                <span>{fmtDate(h.createdAt)}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 9, opacity: 0.7 }}>· {relativeTime(h.createdAt)}</span>
              </div>
              {h.notes && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, fontStyle: "italic" }}>💬 {h.notes}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
