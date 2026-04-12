import { NextResponse } from "next/server";

const API_KEY = process.env.WASENDER_API_KEY || "";

function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 8) return `+591${clean}`;
  if (clean.startsWith("591")) return `+${clean}`;
  return `+591${clean}`;
}

export async function POST(request: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "WasenderApi no configurada" }, { status: 500 });
    }

    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: "Teléfono y mensaje son requeridos" }, { status: 400 });
    }

    const to = formatPhone(phone);

    const res = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ to, text: message }),
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({ success: true, idMessage: data.data?.msgId });
    } else {
      console.error("WasenderApi error:", data);
      return NextResponse.json({ error: "Error al enviar", details: data }, { status: 500 });
    }
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
