"use client";
import { useEffect } from "react";

/**
 * Registra la visita al endpoint /api/pageview
 * No bloqueante — si falla, no afecta la experiencia del usuario
 */
export function PortalTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Evita duplicados en el mismo render usando un flag en sessionStorage (una visita por sesión y por URL)
    const key = `tracked_${window.location.pathname}${window.location.search}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const payload = {
      path: window.location.pathname,
      fullUrl: window.location.href,
      referrer: document.referrer || null,
    };

    // Prefer sendBeacon (sobrevive al unload). Fallback a fetch no bloqueante.
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/pageview", blob);
        return;
      }
    } catch {}

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
