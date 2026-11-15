// Behind the VPS nginx the app sees its internal http:// address; payment webhooks need the public HTTPS origin.
export function publicOrigin(requestUrl: string): string {
  const configured = process.env["PUBLIC_SITE_ORIGIN"]?.trim().replace(/\/+$/, "");
  return configured || new URL(requestUrl).origin;
}
