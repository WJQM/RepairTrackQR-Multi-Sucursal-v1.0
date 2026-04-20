"use client";
import { useEffect, useState } from "react";
import { getLocale, setLocale as setStoredLocale, translate, type Locale } from "@/lib/portal-i18n";

export function usePortalI18n() {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    setLocaleState(getLocale());
    // Limpiar restos del antiguo tema claro si los hay
    if (typeof window !== "undefined") {
      localStorage.removeItem("portalTheme");
      document.documentElement.removeAttribute("data-portal-theme");
    }
    const handler = () => setLocaleState(getLocale());
    window.addEventListener("portal-locale-change", handler);
    return () => window.removeEventListener("portal-locale-change", handler);
  }, []);

  const t = (key: string) => translate(key, locale);
  const change = (l: Locale) => { setStoredLocale(l); setLocaleState(l); };

  return { t, locale, change };
}
