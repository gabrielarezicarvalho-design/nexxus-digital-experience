import { META_PIXEL_ID } from "./meta-pixel";

async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Envia um evento para a API de Conversões do Meta. Nunca lança erro. */
export async function sendMetaEvent(ev: {
  name: string; eventId: string; email?: string; value?: number; currency?: string; url?: string; contentName?: string;
}) {
  const token = process.env["META_CAPI_ACCESS_TOKEN"];
  if (!token) return;
  try {
    const body = {
      data: [{
        event_name: ev.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        event_source_url: ev.url ?? "https://cloudnexapro.site/",
        user_data: ev.email ? { em: [await sha256(ev.email)] } : {},
        custom_data: { value: ev.value, currency: ev.currency ?? "BRL", content_name: ev.contentName },
      }],
    };
    const res = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`Meta CAPI falhou [${res.status}]: ${await res.text()}`);
  } catch (e) { console.error("Meta CAPI erro", e); }
}
