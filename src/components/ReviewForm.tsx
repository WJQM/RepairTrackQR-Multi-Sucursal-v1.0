"use client";
import { useEffect, useState } from "react";

interface Props {
  repairCode: string;
  clientName?: string | null;
}

/**
 * Bloque de reseñas que se muestra en /track/[code] cuando la OT está entregada.
 * - Si ya hay reseña, muestra estrellas + comentario
 * - Si no, muestra form con 5 estrellas + textarea
 */
export function ReviewForm({ repairCode, clientName }: Props) {
  const [existingReview, setExistingReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?repairCode=${encodeURIComponent(repairCode)}`)
      .then(r => r.json())
      .then(d => { if (d.review) setExistingReview(d.review); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repairCode]);

  const submit = async () => {
    if (rating < 1) { setError("Selecciona una calificación"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repairCode, rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setExistingReview(data.review);
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch {
      setError("Error de red");
    }
    setSubmitting(false);
  };

  if (loading) return null;

  // Ya reseñó
  if (existingReview) {
    return (
      <div style={{ padding: "20px 24px", background: "rgba(16,185,129,0.06)", borderRadius: 16, border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>⭐</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gracias por tu reseña</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} style={{ fontSize: 22, color: n <= existingReview.rating ? "#fbbf24" : "#3a3a4e" }}>★</span>
          ))}
        </div>
        {existingReview.comment && (
          <div style={{ fontSize: 12, color: "#8888a0", fontStyle: "italic", maxWidth: 400, margin: "0 auto", padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 10 }}>
            "{existingReview.comment}"
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: "24px 24px", background: "rgba(16,185,129,0.08)", borderRadius: 16, border: "1px solid rgba(16,185,129,0.25)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981", marginBottom: 4 }}>¡Gracias por tu opinión!</div>
        <div style={{ fontSize: 12, color: "#8888a0" }}>Tu reseña fue registrada con éxito</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "22px 24px", background: "rgba(17,17,24,0.6)", borderRadius: 16, border: "1px solid rgba(251,191,36,0.25)" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 26, marginBottom: 4 }}>⭐</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>{clientName ? `${clientName}, ¿` : "¿"}cómo calificas nuestro servicio?</div>
        <div style={{ fontSize: 11, color: "#8888a0" }}>Tu opinión nos ayuda a mejorar</div>
      </div>

      {/* Estrellas */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 38, padding: 4, transition: "transform 0.1s",
              color: n <= (hoverRating || rating) ? "#fbbf24" : "#3a3a4e",
              transform: n <= hoverRating ? "scale(1.1)" : "scale(1)",
            }}
            aria-label={`${n} estrellas`}
          >
            ★
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>
            {rating === 5 ? "¡Excelente! 🎉" : rating === 4 ? "Muy bien 👍" : rating === 3 ? "Bien" : rating === 2 ? "Regular" : "Mejorable"}
          </span>
        </div>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comparte tu experiencia (opcional)..."
        rows={3}
        maxLength={500}
        style={{
          width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10,
          color: "#eeeef2", fontSize: 12, resize: "vertical", fontFamily: "inherit",
          outline: "none", marginBottom: 10,
        }}
      />

      {error && <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 10, textAlign: "center" }}>⚠️ {error}</div>}

      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        style={{
          width: "100%", padding: "12px 20px",
          background: rating > 0 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "rgba(58,58,78,0.4)",
          border: "none", borderRadius: 10, color: rating > 0 ? "#1a1a2e" : "#8888a0",
          fontSize: 13, fontWeight: 800, cursor: submitting ? "wait" : (rating > 0 ? "pointer" : "not-allowed"),
          opacity: submitting ? 0.6 : 1,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}
      >
        {submitting ? "Enviando..." : "Enviar reseña"}
      </button>
    </div>
  );
}
