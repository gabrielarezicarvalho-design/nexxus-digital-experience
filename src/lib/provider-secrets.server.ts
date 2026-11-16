// Chave de API de um fornecedor: primeiro o arquivo de configuração do servidor (variável de ambiente),
// depois a chave cadastrada pelo painel (tabela provider_secrets, só o servidor lê).
const cache = new Map<string, { value: string | undefined; at: number }>();
const TTL_MS = 30_000;

export async function providerSecret(name: string): Promise<string | undefined> {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("provider_secrets").select("api_key").eq("secret_name", name).maybeSingle();
    const value = (data?.api_key as string | undefined) || undefined;
    cache.set(name, { value, at: Date.now() });
    return value;
  } catch {
    return hit?.value;
  }
}

export async function saveProviderSecret(name: string, apiKey: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any).from("provider_secrets")
    .upsert({ secret_name: name, api_key: apiKey, updated_at: new Date().toISOString() }, { onConflict: "secret_name" });
  if (error) throw new Error("Não foi possível guardar a API key: " + error.message);
  cache.delete(name);
}

export async function deleteProviderSecret(name: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("provider_secrets").delete().eq("secret_name", name);
  cache.delete(name);
}

/** Nome da variável derivado do nome da conta, ex.: "Meu Fornecedor 2" -> "MEU_FORNECEDOR_2_API_KEY". */
export function secretNameFor(accountName: string): string {
  const slug = accountName.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const base = /^[A-Z]/.test(slug) ? slug : `P_${slug}`;
  return `${base.slice(0, 80)}_API_KEY`;
}
