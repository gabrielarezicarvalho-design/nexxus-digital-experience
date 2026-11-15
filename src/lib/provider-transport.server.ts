const PROXY_BASE = "https://proxy.cloudnexapro.site/v1";
const GATEWAY = "https://connector-gateway.lovable.dev";

// Exact HTTPS bases routed through their workspace connector; credentials never reach other origins or versions.
const CONNECTOR_BASES: Record<string, { gateway: string; secret: string; label: string; chatPath?: string }> = {
  "https://freeapi.anthropicrevenda.site/v1": { gateway: `${GATEWAY}/udc_freeapi_anthropic_revenda`, secret: "UDC_FREEAPI_ANTHROPIC_REVENDA_API_KEY", label: "FreeAPI Anthropic Revenda" },
  "https://api.nexxus-pro.site": { gateway: `${GATEWAY}/udc_nexxus_pro/v1`, secret: "UDC_NEXXUS_PRO_API_KEY", label: "Nexxus Pro" },
  "https://invision.dreamvision.com.br/v1": { gateway: `${GATEWAY}/udc_invision`, secret: "UDC_INVISION_API_KEY", label: "Invision" },
  "https://api.ialauren.com/v1": { gateway: `${GATEWAY}/udc_lauren_api/v1`, secret: "UDC_LAUREN_API_API_KEY", label: "Lauren" },
  "https://api.tokens-token.com/v1": { gateway: `${GATEWAY}/udc_tokens_token/v1`, secret: "UDC_TOKENS_TOKEN_API_KEY", label: "Tokens Token" },
  // Free AI serves external (premium) models only on POST /v1/chat/; /chat/completions is self-hosted only.
  "https://api.free.ai/v1": { gateway: `${GATEWAY}/udc_free_ai`, secret: "UDC_FREE_AI_API_KEY", label: "Free AI", chatPath: "/chat/" },
};

const connectorFor = (baseUrl: string) => CONNECTOR_BASES[baseUrl.replace(/\/+$/, "")];

// Self-hosted (VPS) mode: call supplier origins directly with the real supplier key stored under the same
// secret name (UDC_*), instead of going through the Lovable connector gateway.
const directProviders = () => process.env["NEXA_DIRECT_PROVIDERS"] === "1";
// Direct origins whose connector route added a version path the saved base lacks.
const DIRECT_BASES: Record<string, string> = {
  "https://api.nexxus-pro.site": "https://api.nexxus-pro.site/v1",
};

export function providerRequestBase(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, "");
  if (directProviders()) return DIRECT_BASES[clean] ?? clean;
  return connectorFor(clean)?.gateway ?? clean;
}

// Chat endpoint per supplier; defaults to the OpenAI-compatible /chat/completions.
export function providerChatUrl(baseUrl: string): string {
  return `${providerRequestBase(baseUrl)}${connectorFor(baseUrl)?.chatPath ?? "/chat/completions"}`;
}

// Model-list probes must use the same connector route as delivery, so connector credentials never reach the supplier origin.
export function providerModelsUrl(baseUrl: string): string {
  return `${providerRequestBase(baseUrl)}/models`;
}

// The internal token is scoped to the exact trusted VPS, never provider-controlled URLs.
export function providerProxyHeaders(baseUrl: string, token = process.env["NEXA_PROXY_ACCESS_TOKEN"], connector = {
  gatewayKey: process.env["LOVABLE_API_KEY"], connectionKey: process.env[connectorFor(baseUrl)?.secret ?? "UDC_INVISION_API_KEY"],
}): Record<string, string> {
  const match = connectorFor(baseUrl);
  if (match && directProviders()) return {};
  if (match) {
    if (!connector.gatewayKey || !connector.connectionKey) throw new Error(`Conexão ${match.label} não configurada.`);
    return { Authorization: `Bearer ${connector.gatewayKey}`, "X-Connection-Api-Key": connector.connectionKey };
  }
  if (baseUrl.replace(/\/+$/, "") !== PROXY_BASE) return {};
  if (!token) throw new Error("Acesso interno do repasse não configurado.");
  return { "X-Nexa-Proxy-Token": token, "User-Agent": "NEXA-Gateway/1.0" };
}
