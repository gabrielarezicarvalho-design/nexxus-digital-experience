import { createFileRoute } from "@tanstack/react-router";
import { syncPayment } from "@/lib/mercadopago.server";

// Não confiamos no corpo: sempre re-consultamos o pagamento na API do Mercado Pago.
export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let id = url.searchParams.get("data.id") ?? url.searchParams.get("id");
        try {
          const body: any = await request.json();
          id = body?.data?.id ?? id;
          if (body?.type && body.type !== "payment" && !body?.action?.startsWith("payment")) return new Response("ignored");
        } catch { /* sem corpo */ }
        if (!id || !/^\d+$/.test(String(id))) return new Response("ok");
        try { await syncPayment(String(id)); } catch (e) { console.error("webhook", e); return new Response("error", { status: 500 }); }
        return new Response("ok");
      },
    },
  },
});
