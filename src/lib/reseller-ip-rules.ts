import ipaddr from "ipaddr.js";
import { z } from "zod";

export function normalizeIp(value: string | null | undefined): string | null {
  if (!value || value.includes("/") || !ipaddr.isValid(value.trim())) return null;
  return ipaddr.process(value.trim()).toString();
}

export const resellerIpsInput = z.object({
  id: z.string().uuid(),
  ips: z.array(z.string().trim().max(45).refine((v) => normalizeIp(v) !== null, "IP inválido"))
    .max(50).transform((ips) => [...new Set(ips.map((ip) => normalizeIp(ip)).filter((ip): ip is string => ip !== null))]),
});

// Cloudflare overwrites this header on the hosted Worker. Never trust caller-supplied X-Forwarded-For.
export function resellerRequestIp(request: Request): string | null {
  return normalizeIp(request.headers.get("cf-connecting-ip"));
}

export function isResellerIpAllowed(ip: string | null, approved: string[]): boolean {
  const normalized = normalizeIp(ip);
  return normalized !== null && approved.some((allowed) => normalizeIp(allowed) === normalized);
}