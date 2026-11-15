import { expect, mock, test } from "bun:test";

let loggedStatus: number | null = null;
mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: {
          id: "test-blocked-key", client_id: "test-client", status: "blocked",
          reseller_blocked: true, clients: { status: "active" },
        } }),
        insert: async (row: { status_code: number }) => { loggedStatus = row.status_code; return { error: null }; },
      };
      if (table !== "api_keys" && table !== "request_logs") throw new Error("Blocked key reached downstream processing");
      return query;
    },
  },
}));

test("ambos os protocolos recusam comandos com aviso de regularização antes do fornecedor, inclusive streaming", async () => {
  const previous = process.env["CODECRAFT_API_KEY"];
  process.env["CODECRAFT_API_KEY"] = "test-only";
  try {
    const routes = [
      (await import("../routes/api/public/v1/messages")).Route,
      (await import("../routes/api/public/v1/chat/completions")).Route,
    ];
    for (const route of routes) {
      const handler = (route.options as any).server.handlers.POST;
      for (const stream of [false, true]) {
        loggedStatus = null;
        const response: Response = await handler({ request: new Request("http://localhost:8080/api/public/v1/messages", {
          method: "POST", headers: { authorization: "Bearer test-key", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-5", messages: [{ role: "user", content: "oi" }], stream }),
        }) });
        expect(response.status).toBe(403);
        expect((await response.json()).error.type).toBe("permission_error");
        expect(loggedStatus).toBe(403);
      }
    }
  } finally {
    if (previous === undefined) delete process.env["CODECRAFT_API_KEY"];
    else process.env["CODECRAFT_API_KEY"] = previous;
  }
});