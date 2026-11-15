export const RESELLER_ORIGIN = "https://apirevenda.site";
export const RESELLER_BASE = `${RESELLER_ORIGIN}/api/public`;
export const RESELLER_KEYS_API = `${RESELLER_BASE}/v1/reseller/keys`;

export function resellerPanelBrand(hostname: string): "API CLAUDE" | "Revenda Cloud" {
  const host = hostname.toLowerCase();
  return host === "apiclaude.site" || host.endsWith(".apiclaude.site") ? "API CLAUDE" : "Revenda Cloud";
}

/** Resolve presentation URLs from the stored reseller identity, not user input. */
export function resellerApiUrls(email: string | null | undefined) {
  const origin = email?.trim().toLowerCase() === "bruebielcasal@gmail.com"
    ? "https://apiclaude.site"
    : RESELLER_ORIGIN;
  const base = `${origin}/api/public`;
  return { origin, base, openai: `${base}/v1`, keys: `${base}/v1/reseller/keys` };
}

export function isResellerHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ["apiclaude.site", "apirevenda.site"].some((domain) => host === domain || host.endsWith(`.${domain}`));
}