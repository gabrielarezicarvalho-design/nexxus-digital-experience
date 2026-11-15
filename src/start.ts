import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { isResellerHostname } from "./lib/reseller-domain";
import { resellerPanelHtml } from "./lib/pulse-panel";
import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Reseller API hostnames must never render the main site, not even briefly:
// answer page navigations with the maintenance screen before SSR runs.
const resellerMaintenanceMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    const url = new URL(request.url);
    const host = (request.headers.get("x-forwarded-host") || url.hostname).split(":")[0] ?? "";
    const path = url.pathname;
    const passthrough =
      path.startsWith("/api") || path.startsWith("/_") ||
      path.startsWith("/assets") || /\.[a-z0-9]+$/i.test(path);
    if (request.method === "GET" && isResellerHostname(host) && !passthrough) {
      return new Response(resellerPanelHtml(host, request.headers.get('accept-language') ?? '', request.headers.get('cf-ipcountry') ?? ''), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
  } catch {
    // fall through to normal handling
  }
  return next();
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, resellerMaintenanceMiddleware, csrfMiddleware],
}));
