// Helper para notificaciones WhatsApp automáticas
// Se llama desde el backend cuando ocurre un evento importante
// Si falla, NO bloquea la respuesta al usuario

const API_KEY = process.env.WASENDER_API_KEY || "";

function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 8) return `+591${clean}`;
  if (clean.startsWith("591")) return `+${clean}`;
  return `+591${clean}`;
}

export async function sendWhatsAppSafe(phone: string | null | undefined, message: string): Promise<boolean> {
  if (!API_KEY) return false;
  if (!phone || !phone.trim()) return false;
  if (!message || !message.trim()) return false;

  const to = formatPhone(phone);

  try {
    const res = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ to, text: message }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (error) {
    console.error("WhatsApp auto-send failed:", error);
    return false;
  }
}

interface RepairInfo {
  code: string;
  device: string;
  brand?: string | null;
  model?: string | null;
  estimatedCost?: number;
  clientName?: string | null;
}

interface CompanyInfo {
  companyName: string;
  website?: string | null;
}

// URL fija del portal público donde el cliente puede consultar cualquier documento por código
const PORTAL_URL = "https://degree-project.com/portal";

export function buildRepairCreatedMessage(repair: RepairInfo, company: CompanyInfo, _trackUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  return `${name}! 👋

Recibimos su equipo *${device}* en ${company.companyName}. Gracias por confiar en nosotros.

📋 *Código de seguimiento:* ${repair.code}

Puede consultar el estado de su reparación ingresando su código en nuestro portal:
🔗 ${PORTAL_URL}

Le avisaremos cuando tengamos novedades. ¡Saludos! 🛠️`;
}

export function buildRepairCompletedMessage(repair: RepairInfo, company: CompanyInfo, _trackUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  const total = repair.estimatedCost ? `💰 Total: *Bs. ${repair.estimatedCost}*` : "";
  return `${name}! ✅

¡Buenas noticias! Su equipo *${device}* ya está *listo para recoger*.

📋 Código: ${repair.code}
${total}

Por favor acérquese a nuestra tienda ${company.companyName} para retirarlo.

Consulte detalles en nuestro portal con su código ${repair.code}:
🔗 ${PORTAL_URL}

¡Gracias por su paciencia! 🎉`;
}

export function buildRepairDeliveredMessage(repair: RepairInfo, company: CompanyInfo, ceCode: string, _ceUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  return `${name}! 📦

Su equipo *${device}* fue entregado correctamente.

Gracias por elegir ${company.companyName}. Este es su certificado de entrega:
📄 *${ceCode}*

Puede consultar y descargar su certificado ingresando el código ${ceCode} en nuestro portal:
🔗 ${PORTAL_URL}

Ante cualquier duda estamos a su disposición. ¡Hasta pronto! 👋`;
}

export function buildDiagnosticMessage(repair: RepairInfo, company: CompanyInfo, _trackUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  return `${name}! 🔍

Terminamos el diagnóstico de su equipo *${device}*. 

📋 Código: ${repair.code}

Un técnico lo contactará pronto para detallar el procedimiento a seguir. Mientras tanto puede ver el avance ingresando su código en nuestro portal:
🔗 ${PORTAL_URL}

— ${company.companyName}`;
}

export function buildInProgressMessage(repair: RepairInfo, company: CompanyInfo, _trackUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  return `${name}! 🔧

Le informamos que su equipo *${device}* está *en reparación* ahora mismo.

📋 Código: ${repair.code}

Le avisaremos apenas esté listo. Consulte el avance con su código ${repair.code} en nuestro portal:
🔗 ${PORTAL_URL}

— ${company.companyName}`;
}

export function buildWaitingPartsMessage(repair: RepairInfo, company: CompanyInfo, _trackUrl?: string): string {
  const name = repair.clientName ? `Hola ${repair.clientName}` : "Hola";
  const device = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  return `${name}! 📦

Su equipo *${device}* está a la espera de repuestos.

📋 Código: ${repair.code}

Apenas tengamos la pieza continuaremos con la reparación. Consulte detalles con su código ${repair.code} en:
🔗 ${PORTAL_URL}

Gracias por su paciencia.
— ${company.companyName}`;
}
