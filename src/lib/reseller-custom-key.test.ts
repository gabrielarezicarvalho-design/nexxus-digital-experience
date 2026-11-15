import { test, expect, mock } from "bun:test";
import assert from "node:assert/strict";

const stored: Record<string, any>[] = [];
const reseller = { email: "diegopiantkoski@gmail.com" };
const custom: { id: string; code: string; reseller_id: string; name: string; active: boolean; token_limit: number | null; daily_token_limit: number | null; duration_days: number | null; rpm_limit: number } = { id: "plan-1", code: "rp_owned", reseller_id: "owner", name: "Plano do cliente", active: true, token_limit: 5_000_000, daily_token_limit: null, duration_days: null, rpm_limit: 60 };
mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: Record<string, any> = {};
      let insert: Record<string, any> | null = null;
      const result = () => {
        if (table === "resellers") return { data: { id: "owner", status: "active", email: reseller.email, cost_cents: 2990, debt_limit_cents: 20000 } };
        if (table === "reseller_plans") return { data: filters['reseller_id'] === "owner" && filters['code'] === custom.code ? custom : null };
        if (table === "api_keys" && insert) return { data: { id: "key-id", ...insert } };
        if (table === "reseller_payouts") return { data: [{ amount_cents: 1_000_000 }] };
        return { data: [] };
      };
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        insert: (row: Record<string, any>) => { insert = row; stored.push(row); return query; },
        single: async () => result(), maybeSingle: async () => result(),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  },
}));

test("geração de chave usa os limites personalizados e mantém o repasse", async () => {
  const { generateKey } = await import("./reseller.server");
  await generateKey("owner", "rp_owned", "Cliente");
  expect(stored[0]?.['token_limit']).toBe(5_000_000);
  expect(stored[0]?.['expires_at']).toBe(null);
  expect(stored[0]?.['reseller_cost_cents']).toBe(2990);
  expect(stored[0]?.['rpm_limit']).toBe(60);
});

test("geração rejeita o plano personalizado de outra revenda", async () => {
  const { generateKey } = await import("./reseller.server");
  const before = stored.length;
  await assert.rejects(generateKey("other", "rp_owned"), /Plano não encontrado/);
  expect(stored.length).toBe(before);
});

test("emissão compartilhada rejeita ilimitado antes de criar uma chave", async () => {
  const { generateKey } = await import("./reseller.server");
  const before = stored.length;
  custom.token_limit = null;
  try {
    await assert.rejects(generateKey("owner", "rp_owned"), /ilimitados/);
    expect(stored.length).toBe(before);
  } finally { custom.token_limit = 5_000_000; }
});

test("emissão mensal transporta 150 milhões por dia para a chave", async () => {
  const { generateKey } = await import("./reseller.server");
  custom.token_limit = null;
  custom.daily_token_limit = 150_000_000;
  custom.duration_days = 30;
  try {
    await generateKey("owner", "rp_owned");
    expect(stored.at(-1)?.['daily_token_limit']).toBe(150_000_000);
    expect(stored.at(-1)?.['token_limit']).toBe(null);
  } finally { custom.token_limit = 5_000_000; custom.daily_token_limit = null; custom.duration_days = null; }
});
test("outra revenda não gera chave paga, teste grátis nem teste de 30 minutos", async () => {
  const { generateKey, generateTrialKey, generateHourTrialKey } = await import("./reseller.server");
  const before = stored.length;
  reseller.email = "outra@revenda.com";
  try {
    await assert.rejects(generateKey("owner", "rp_owned"), /Geração de chaves desativada/);
    await assert.rejects(generateTrialKey("owner"), /Geração de chaves desativada/);
    await assert.rejects(generateHourTrialKey("owner"), /Geração de chaves desativada/);
    expect(stored.length).toBe(before);
  } finally { reseller.email = "diegopiantkoski@gmail.com"; }
});

test("outra revenda não altera plano nem dias de chave antiga", async () => {
  const { updateResellerKey } = await import("./reseller.server");
  reseller.email = "outra@revenda.com";
  try {
    await assert.rejects(updateResellerKey("owner", "sk-nx-chave-antiga", { dias: 30 }), /Geração de chaves desativada/);
    await assert.rejects(updateResellerKey("owner", "sk-nx-chave-antiga", { plano: "rp_owned" }), /Geração de chaves desativada/);
  } finally { reseller.email = "diegopiantkoski@gmail.com"; }
});
