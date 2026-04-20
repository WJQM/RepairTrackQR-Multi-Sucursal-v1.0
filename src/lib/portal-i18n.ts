// Traducciones del portal público (ES/EN)
// Uso: const t = useT(); ... <span>{t("common.search")}</span>

export type Locale = "es" | "en";

const DICT: Record<string, { es: string; en: string }> = {
  // Hero
  "hero.welcome": { es: "Bienvenido al portal", en: "Welcome to the portal" },
  "hero.slogan": { es: "Tu servicio técnico de confianza", en: "Your trusted technical service" },

  // Feature pills
  "features.tracking": { es: "Seguimiento de reparaciones", en: "Repair tracking" },
  "features.documents": { es: "Consulta tus documentos", en: "Check your documents" },
  "features.quotes": { es: "Cotizaciones y notas de venta", en: "Quotes and sales notes" },
  "features.catalog": { es: "Catálogo de productos", en: "Product catalog" },
  "features.software": { es: "Programas y software", en: "Software and programs" },
  "features.games": { es: "Videojuegos", en: "Video games" },
  "features.consoles": { es: "Consolas", en: "Consoles" },
  "features.laptops": { es: "Laptops y PCs a la venta", en: "Laptops and PCs for sale" },

  // Consultar documento
  "consult.title": { es: "Consultar Documento", en: "Check Document" },
  "consult.subtitle": { es: "Escanea cualquier QR o ingresa el código manualmente", en: "Scan any QR code or enter the code manually" },
  "consult.scan": { es: "Escanear QR", en: "Scan QR" },
  "consult.search": { es: "Buscar", en: "Search" },
  "consult.placeholder": { es: "OT-1, CE-1, COT-1, NV-1, CL-1, EQ-XXXXXX, CN-1...", en: "OT-1, CE-1, COT-1, NV-1, CL-1, EQ-XXXXXX, CN-1..." },
  "consult.searching": { es: "Buscando documento...", en: "Searching document..." },

  // Tabs
  "tabs.products": { es: "Productos", en: "Products" },
  "tabs.software": { es: "Programas", en: "Programs" },
  "tabs.games": { es: "Videojuegos", en: "Video games" },
  "tabs.consoles": { es: "Consolas", en: "Consoles" },
  "tabs.equipment": { es: "Equipos", en: "Equipment" },

  // Common
  "common.search": { es: "Buscar", en: "Search" },
  "common.all": { es: "Todas", en: "All" },
  "common.close": { es: "Cerrar", en: "Close" },
  "common.prev": { es: "Anterior", en: "Previous" },
  "common.next": { es: "Siguiente", en: "Next" },
  "common.page": { es: "Página", en: "Page" },
  "common.of": { es: "de", en: "of" },
  "common.noResults": { es: "No se encontraron resultados", en: "No results found" },
  "common.noProducts": { es: "No hay productos disponibles en este momento", en: "No products available right now" },
  "common.tryOther": { es: "Intenta con otro término de búsqueda", en: "Try a different search term" },

  // Inventory
  "inv.stock": { es: "Stock", en: "Stock" },
  "inv.searchProduct": { es: "Buscar producto...", en: "Search product..." },

  // Console details
  "cn.category": { es: "Categoría", en: "Category" },
  "cn.state.new": { es: "Nueva", en: "New" },
  "cn.state.used": { es: "Used", en: "Used" },
  "cn.brand": { es: "Marca", en: "Brand" },
  "cn.model": { es: "Modelo", en: "Model" },
  "cn.color": { es: "Color", en: "Color" },
  "cn.storage": { es: "Almacenamiento", en: "Storage" },
  "cn.generation": { es: "Generación", en: "Generation" },
  "cn.accessories": { es: "Accesorios incluidos", en: "Included accessories" },
  "cn.notes": { es: "Notas", en: "Notes" },
  "cn.price": { es: "Precio", en: "Price" },
  "cn.contact": { es: "¿Te interesa esta consola? Contáctanos", en: "Interested? Contact us" },

  // Videogames
  "vg.platform": { es: "Plataforma", en: "Platform" },
  "vg.genre": { es: "Género", en: "Genre" },
  "vg.rating": { es: "Clasificación", en: "Rating" },
  "vg.language": { es: "Idioma", en: "Language" },
  "vg.size": { es: "Tamaño", en: "Size" },
  "vg.description": { es: "Descripción", en: "Description" },
  "vg.minReq": { es: "Requisitos Mínimos", en: "Minimum Requirements" },
  "vg.recReq": { es: "Requisitos Recomendados", en: "Recommended Requirements" },
  "vg.contact": { es: "¿Te interesa este videojuego? Contáctanos", en: "Interested in this game? Contact us" },

  // Software
  "sw.category": { es: "Categoría", en: "Category" },
  "sw.minReq": { es: "Requisitos Mínimos", en: "Minimum Requirements" },
  "sw.recReq": { es: "Requisitos Recomendados", en: "Recommended Requirements" },
  "sw.contact": { es: "¿Te interesa este programa? Contáctanos", en: "Interested in this program? Contact us" },

  // Equipment
  "eq.processor": { es: "Procesador", en: "Processor" },
  "eq.ram": { es: "Memoria RAM", en: "RAM" },
  "eq.storage": { es: "Almacenamiento", en: "Storage" },
  "eq.graphics": { es: "Gráficos", en: "Graphics" },
  "eq.contact": { es: "¿Te interesa este equipo? Contáctanos", en: "Interested in this equipment? Contact us" },

  // Footer
  "footer.contact": { es: "Para consultas sobre disponibilidad o precios, contacta con nuestro equipo", en: "For availability or pricing inquiries, contact our team" },
};

export function getLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem("portalLocale");
  if (stored === "en" || stored === "es") return stored;
  return "es";
}

export function setLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem("portalLocale", locale);
  // forzar re-render global
  window.dispatchEvent(new Event("portal-locale-change"));
}

export function translate(key: string, locale: Locale): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[locale] || entry.es;
}
