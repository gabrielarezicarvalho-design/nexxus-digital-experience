import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SECRET = "CLEANAPIS_API_KEY";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

export type CleanKeyRow = {
  idx: number; secret: string; label: string | null; credit_tokens: number | null;
  rotation_disabled: boolean; rotation_disabled_reason: string | null;
  tokens_used: number; requests_count: number; errors_count: number;
  last_status: number | null; last_error: string | null; last_used_at: string | null;
};

// Identifica as chaves apenas pelo índice; nunca retorna partes do segredo.
export const adminCleanKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const present: { idx: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const v = process.env[i === 0 ? SECRET : `${SECRET}_${i}`];
      if (v) present.push({ idx: i });
    }
    const { data } = await context.supabase.from("provider_key_usage").select("*").eq("secret_name", SECRET);
    const usage = new Map<number, any>((data ?? []).map((r: any) => [r.key_index, r]));
    const rows: CleanKeyRow[] = present.map(({ idx }) => {
      const u = usage.get(idx);
      return {
        idx, secret: idx === 0 ? SECRET : `${SECRET}_${idx}`,
        rotation_disabled: u?.rotation_disabled ?? false, rotation_disabled_reason: u?.rotation_disabled_reason ?? null,
        label: u?.label ?? null, credit_tokens: u?.credit_tokens ?? null,
        tokens_used: Number(u?.tokens_used ?? 0), requests_count: Number(u?.requests_count ?? 0), errors_count: Number(u?.errors_count ?? 0),
        last_status: u?.last_status ?? null, last_error: u?.last_error ?? null, last_used_at: u?.last_used_at ?? null,
      };
    });
    return rows;
  });

// Define o crédito total (em tokens) de uma chave, para o painel calcular quanto resta.
export const adminSetCleanKeyCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ idx: z.number().int().min(0).max(20), credit_tokens: z.number().int().min(0).nullable(), reset: z.boolean().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { secret_name: SECRET, key_index: data.idx, credit_tokens: data.credit_tokens, updated_at: new Date().toISOString() };
    if (data.reset) Object.assign(patch, { tokens_used: 0, requests_count: 0, errors_count: 0 });
    const { error } = await supabaseAdmin.from("provider_key_usage").upsert(patch as any, { onConflict: "secret_name,key_index" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
