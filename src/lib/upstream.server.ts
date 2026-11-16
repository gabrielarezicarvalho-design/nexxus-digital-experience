import { FREE_AI_PROVIDER, rebrandResponse, withNexaIdentity } from "./free-ai-identity";
import { planExclusiveProvider } from "./plan-exclusive-models";
import { nexacleanModel, NEXACLEAN_PROVIDER, NEXACLEAN_UPSTREAM } from "./nexaclean-models";
import { comboOrder, isComboName, nextComboTurn, type ComboStrategy } from "./model-combos";
import { anthropicRevendaCombo as revendaCombo, tokensTokenCombo } from './provider-catalog';
const anthropicRevendaCombo = (a: { name: string; available_models?: string[] | null }, m: string) => revendaCombo(a, m) ?? tokensTokenCombo(a, m);
import { INVISION_MODEL_ALIASES } from './invision-models';
export { INVISION_MODEL_ALIASES } from './invision-models';
// Pedidos comuns seguem a prioridade salva, sem antecipar o dono do modelo.
// O ID interno só é usado no fornecedor correspondente; nunca troca o modelo escolhido.
//
// SubtoAPI is the owner's preferred provider for its explicit deployment tiers.
// Versioned Claude models retain their compatible reserve chain below.
// Nenhuma reserva é promovida por sucesso próprio.
import { fallbackOrder, isQuotaError } from "./deepseek-fallback";
import { ASTRA_ALIAS, ASTRA_TARGET, astraAliasAvailable } from './astra-alias';
import { fetchSubtoapi, isSubtoapiTier, subtoapiTier } from "./subtoapi.server";
import { providerChatUrl, providerProxyHeaders } from "./provider-transport.server";
import { sanitizeProviderCause, type ProviderFailure } from './upstream-diagnostics';
import { COMBO_COOLDOWN_MS, COOLDOWN_MS, cooldownKey, orderByCooldown } from './provider-cooldown';
import { isNexxusHourlyLimit, nexxusHourlyReset, PROVIDER_QUOTA_MODEL, skipHourlyPaused } from './nexxus-hourly-limit';
import { freeApiSlot } from './freeapi-slots';
import { dropErrorAfterFinish, peekStreamStart } from './stream-peek';
import { devhubComboModels, devhubServesInCommonLine } from './devhub-combos';
import { fetchWithFirstByteDeadline, firstByteDeadlineApplies, firstByteTimeoutBody, FIRST_BYTE_DEADLINE_MS, FIRST_BYTE_RETRIES } from './first-byte-deadline';

type Account = { name: string; base_url: string; api_secret_name: string; default_model?: string | null; available_models?: string[] | null; dedicated_only?: boolean | null };

const PROVIDER_CHAIN = [
  { name: "RadoxAI", base_url: "https://radoxai.com/v1", api_secret_name: "RADOXAI_API_KEY" },
  { name: "CodeCraft API", base_url: "https://www.codecraftapi.com/v1", api_secret_name: "CODECRAFT_API_KEY" },
  { name: "Clean APIs", base_url: "https://cleanapis.com/v1", api_secret_name: "CLEANAPIS_API_KEY" },
  { name: "AIPrimeTech", base_url: "https://aiprimetech.io/v1", api_secret_name: "AIPRIMETECH_API_KEY" },
] as const;
const DEFAULT: Account = PROVIDER_CHAIN[0];

// Cada etapa da fila traz o nome de modelo que aquele fornecedor entende: o pedido genérico
// "claude" vira o modelo Claude da RadoxAI e, se ela cair, o "claude" da Anthropic Revenda.
type Hop = { account: Account; upstreamModel: string; combo?: boolean };

// A DevHub combo becomes one hop per DevHub model, so any failure moves to the next model.
export function expandDevhubCombos(chain: Hop[], model: string): Hop[] {
  return chain.flatMap((hop) => {
    const models = devhubComboModels(hop.account, model);
    return models ? models.map((upstreamModel) => ({ account: hop.account, upstreamModel, combo: true })) : [hop];
  });
}

// Anthropic Revenda's outage combo answers only after every other hop failed, as the very last attempt.
export const OUTAGE_COMBO = "suporte-queda";
export function withOutageCombo<T extends Hop>(hops: T[]): (T | Hop)[] {
  const anthropic = hops.find((hop) => hop.account.name === "Anthropic Revenda" && hop.upstreamModel !== OUTAGE_COMBO
    && hop.account.available_models?.includes(OUTAGE_COMBO));
  return anthropic ? [...hops, { account: anthropic.account, upstreamModel: OUTAGE_COMBO, combo: true }] : hops;
}

// A prioridade salva define quem atende primeiro; cada etapa recebe o nome de modelo
// que aquele fornecedor entende, resolvido a partir do ID público.
export function versionedClaudeHops(owner: Account, accounts: Account[], publicModel: string, upstreamModel: string): Hop[] {
  const hops: Hop[] = [];
  for (const account of accounts) {
    if (account.name === owner.name) hops.push({ account, upstreamModel: anthropicRevendaCombo(account, publicModel) ?? upstreamModel });
    else {
      const model = reserveModel(account, publicModel);
      if (model) hops.push({ account, upstreamModel: model });
    }
  }
  return hops;
}

// Nomes equivalentes que as reservas entendem para cada modelo público da Ghost.
// O nome público nunca muda; só o nome enviado por trás para cada fornecedor.
const RESERVE_MODEL_ALIASES: Record<string, string[]> = {
  "claude-opus-5-5": ["claude-opus-5.5", "claude-opus-5"],
  "claude-fable-5.1": ["claude-fable-5"],
};

// Nomes que a Invision atende por trás de cada modelo público da Ghost.
// O nome público nunca muda; só o nome enviado por trás para a Invision.

// Nome que a Invision conhece para um modelo público, quando mapeado e disponível.
function invisionModel(account: Account, upstreamModel: string): string | null {
  if (account.name !== "Invision") return null;
  const mapped = INVISION_MODEL_ALIASES[upstreamModel];
  return mapped && account.available_models?.includes(mapped) ? mapped : null;
}

// Same model written with "." or "-" (claude-fable-5.1 = claude-fable-5-1) is one public model.
export function sameModelSpelling(available: string[] | null | undefined, model: string): string | null {
  const key = (v: string) => v.toLowerCase().replace(/[.\-_]/g, "-");
  return (available ?? []).find((m) => key(m) === key(model)) ?? null;
}

// Nome que uma reserva conhece para o modelo da Ghost: exato, equivalente ou o próprio
// quando o fornecedor conhecido não publica lista de modelos.
function reserveModel(account: Account, upstreamModel: string): string | null {
  // Lauren is configured for a dedicated client only, not as a global reserve.
  if (account.name === "Lauren API") return null;
  const freeSlot = freeApiSlot(account, upstreamModel);
  if (freeSlot) return freeSlot;
  const combo = anthropicRevendaCombo(account, upstreamModel);
  if (combo) return combo;
  const invision = invisionModel(account, upstreamModel);
  if (invision) return invision;
  if (account.available_models?.includes(upstreamModel)) return upstreamModel;
  const spelled = sameModelSpelling(account.available_models, upstreamModel);
  if (spelled) return spelled;
  for (const alias of RESERVE_MODEL_ALIASES[upstreamModel] ?? []) {
    if (account.available_models?.includes(alias)) return alias;
  }
  if (PROVIDER_CHAIN.some((known) => known.name === account.name) && !account.available_models?.length) return upstreamModel;
  return null;
}

export function dedicatedProviders(value: string): string[] {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

// Cliente fixado pelo administrador: só esse fornecedor, com o nome que ele conhece.
export function forcedHop(account: Account & { available_models?: string[] | null }, model: string, internalId?: string | null): Hop {
  const known = account.available_models ?? [];
  const invision = invisionModel(account, model);
  const upstreamModel = freeApiSlot(account, model) ?? anthropicRevendaCombo(account, model) ?? invision ?? (known.includes(model) ? model
    : internalId && known.includes(internalId) ? internalId
    : sameModelSpelling(known, model) ?? (internalId ? sameModelSpelling(known, internalId) : null) ?? (account.default_model || model));
  return { account, upstreamModel };
}

// Ativos fora da rota comum: só atendem chaves com cadeia dedicada.
export const DEDICATED_ONLY_PROVIDERS = ["FreeModel", "Lauren API", "FreeAPI Anthropic Revenda"];

// Fixed list plus providers the administrator marked dedicated_only in provider_accounts.
export function isDedicatedOnly(account: { name: string; dedicated_only?: boolean | null }): boolean {
  return DEDICATED_ONLY_PROVIDERS.includes(account.name) || account.dedicated_only === true;
}

// Every model, Opus included, follows the saved priority in the common chain (Gabriel, 14/11/2026: DevHub principal for all).
export function globalProviderHops(accounts: Account[], model: string, ownerName?: string, internalId?: string | null, internals?: Map<string, string | null>): Hop[] {
  const common = accounts.filter(account => !isDedicatedOnly(account) && devhubServesInCommonLine(account, model));
  const ordered = common;
  return ordered.map(account => ({
    account,
    upstreamModel: reserveModel(account, model) ?? internals?.get(account.name) ?? (account.name === ownerName && internalId ? internalId : model),
  }));
}

export function isUnavailableModel(status: number, text: string): boolean {
  return status === 400 && /(?:model|modelo).*(?:not.?found|not.?available|not.?supported|unknown|invalid|unsupported|unavailable|inexistente|n[aã]o.*(?:encontrado|dispon[ií]vel|suportado))|(?:unknown|invalid|unsupported).*model/i.test(text);
}

async function resolveRoute(model: string, forcedProvider?: string | null): Promise<{ chain: Hop[] }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: modelRows }, { data: accounts }] = await Promise.all([
      // O mesmo nome pode existir em vários fornecedores (uma linha por fornecedor), cada um com seu modelo interno.
      supabaseAdmin.from("models").select("provider, internal_id").eq("name", model).order("created_at"),
      supabaseAdmin.from("provider_accounts").select("name, base_url, api_secret_name, default_model, available_models, dedicated_only")
        .eq("active", true).eq("paused", false).order("priority").order("created_at"),
    ]);
    const all = (accounts ?? []) as Account[];
    const rows = (modelRows ?? []) as { provider: string; internal_id: string | null }[];
    const internals = new Map(rows.filter((r) => r.internal_id).map((r) => [r.provider, r.internal_id] as [string, string | null]));
    const firstActive = rows.find((r) => all.some((a) => a.name === r.provider));
    const row = firstActive ?? rows[0];
    // Clientes sem cadeia dedicada seguem a prioridade salva dos fornecedores comuns.
    const list = forcedProvider ? all : all.filter((a) => !isDedicatedOnly(a));
    const upstreamModel = row?.internal_id || model;

    if (model === ASTRA_ALIAS) {
      const permitted = forcedProvider ? dedicatedProviders(forcedProvider) : null;
      const account = list.find(a => (!permitted || permitted.includes(a.name)) && astraAliasAvailable(a.name, a.available_models ?? []));
      if (!account) throw new Error('Alias Astra indisponível neste fornecedor');
      return { chain: [{ account, upstreamModel: ASTRA_TARGET }] };
    }

    // Combo da Nexa: tenta os itens do combo (fornecedor + modelo), em ordem ou em rodízio.
    if (isComboName(model)) {
      const { data: combo } = await (supabaseAdmin as any).from("model_combos")
        .select("strategy, enabled, model_combo_items(position, provider, model)").eq("name", model.toLowerCase()).maybeSingle();
      if (combo) {
        if (!combo.enabled) throw new Error("Combo desativado");
        const items = ((combo.model_combo_items ?? []) as { position: number; provider: string; model: string }[]).sort((a, b) => a.position - b.position);
        const chain = comboOrder(items, combo.strategy as ComboStrategy, nextComboTurn(model))
          .map((item) => ({ account: all.find((a) => a.name === item.provider), upstreamModel: item.model }))
          .filter((hop): hop is Hop => Boolean(hop.account));
        if (!chain.length) throw new Error("Nenhum fornecedor do combo está ativo");
        return { chain };
      }
    }

    // Nexaclean vai só para o Free.ai, com ou sem cadeia dedicada na chave.
    if (nexacleanModel(model)) {
      const owner = all.find((a) => a.name === NEXACLEAN_PROVIDER);
      if (!owner) throw new Error("Modelo temporariamente indisponível");
      return { chain: [{ account: owner, upstreamModel: NEXACLEAN_UPSTREAM }] };
    }

    if (forcedProvider) {
      // "A,B" = principal e reserva dedicadas; reserva só entra se conhecer o modelo.
      const names = dedicatedProviders(forcedProvider);
      const accounts = names.map((n) => all.find((a) => a.name === n)).filter((a): a is Account => Boolean(a));
      if (!accounts.length) throw new Error("Fornecedor dedicado indisponível");
      const supports = (a: Account & { available_models?: string[] | null }) => Boolean(devhubComboModels(a, model)) || Boolean(freeApiSlot(a, row?.internal_id || model)) || Boolean(anthropicRevendaCombo(a, model)) || Boolean(invisionModel(a, model)) || (a.available_models ?? []).includes(model) || Boolean(sameModelSpelling(a.available_models, model)) || Boolean(row?.internal_id && ((a.available_models ?? []).includes(row.internal_id) || sameModelSpelling(a.available_models, row.internal_id)));
      const chain = accounts.filter((a, i) => i === 0 ? supports(a) || accounts.length === 1 : supports(a)).map((a) => forcedHop(a, model, internals.get(a.name) ?? row?.internal_id));
      const first = accounts[0];
      if (!first) throw new Error("Fornecedor dedicado indisponível");
      return { chain: chain.length ? chain : [forcedHop(first, model, row?.internal_id)] };
    }

    // Plan-exclusive models go only to their owning provider (even if it is dedicated-only), never to the common queue.
    const exclusiveOwner = planExclusiveProvider(model);
    if (exclusiveOwner) {
      const owner = all.find((a) => a.name === exclusiveOwner);
      if (!owner) throw new Error("Modelo temporariamente indisponível");
      return { chain: [{ account: owner, upstreamModel }] };
    }

    if (isSubtoapiTier(model)) {
      const account = list.find((account) => account.name === "SubtoAPI");
      if (!account) throw new Error("Nível temporariamente indisponível");
      const tier = subtoapiTier(model);
      if (!tier) throw new Error("Nível temporariamente indisponível");
      return { chain: [{ account, upstreamModel: tier }] };
    }

    // Nome do catálogo que só existe em fornecedor fora da fila comum (ex.: Free.ai): vai direto para ele.
    const commonOwner = rows.some((r) => list.some((a) => a.name === r.provider));
    const dedicatedOwners = rows.map((r) => ({ r, account: all.find((a) => a.name === r.provider && isDedicatedOnly(a)) })).filter((x) => x.account);
    if (!commonOwner && dedicatedOwners.length) {
      return { chain: dedicatedOwners.map(({ r, account }) => ({ account: account!, upstreamModel: r.internal_id || model })) };
    }

    return { chain: globalProviderHops(list, model, row?.provider, upstreamModel, internals) };
  } catch (error) {
    if (model === ASTRA_ALIAS || isSubtoapiTier(model) || forcedProvider || nexacleanModel(model) || isComboName(model)) throw error;
    return { chain: [{ account: DEFAULT, upstreamModel: model }] };
  }
}

// Chave principal (índice 0) + extras numeradas (CLEANAPIS_API_KEY_1 ... _20) para rotação.
function accountKeys(secretName: string): { idx: number; value: string }[] {
  const keys: { idx: number; value: string }[] = [];
  const base = process.env[secretName];
  if (base) keys.push({ idx: 0, value: base });
  for (let i = 1; i <= 20; i++) {
    const extra = process.env[`${secretName}_${i}`];
    if (extra) keys.push({ idx: i, value: extra });
  }
  return keys;
}

const rotation: Record<string, number> = {};
// Keep rejections local immediately and persistent across Worker instances.
const rejectedCleanKeys = new Set<number>();

async function eligibleAccountKeys(account: Account) {
  const keys = accountKeys(account.api_secret_name);
  if (!keys.length) {
    const { providerSecret } = await import("./provider-secrets.server");
    const stored = await providerSecret(account.api_secret_name);
    if (stored) keys.push({ idx: 0, value: stored });
  }
  if (account.name !== "Clean APIs") return keys;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("provider_key_usage")
    .select("key_index, rotation_disabled").eq("secret_name", account.api_secret_name);
  if (error) throw new Error("Não foi possível verificar as chaves disponíveis da Clean");
  const disabled = new Set((data ?? []).filter((row) => row.rotation_disabled).map((row) => row.key_index));
  return keys.filter((key) => !disabled.has(key.idx) && !rejectedCleanKeys.has(key.idx));
}

// Status que indicam fornecedor fora do ar (manutenção, timeout, modelo sumiu durante atualização).
export function isOutage(status: number): boolean {
  return status === 404 || status === 408 || (status >= 500 && status <= 599);
}

// Apenas limites transitórios de volume; bloqueios de autenticação e saldo não são queda.
export function isMinuteRateLimit(status: number, text: string): boolean {
  if (status !== 429) return false;
  // HTTP 429 já indica limitação temporária, mesmo sem mensagem padronizada.
  // Nunca usar a troca para contornar restrições de credencial ou falta de saldo.
  return !/authenticat|autentica|credential|credencia|invalid.?api.?key|api.?key.?inv[aá]lida|quota|cota|credit|cr[eé]dito|balance|saldo|insufficient|billing|payment|pagamento|account.?blocked|account.?suspended/i.test(text);
}

function waitForCleanRetry(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 3000);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function recordKey(secret: string, idx: number, tokens: number, status: number, error: string | null) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("record_provider_key_usage", { _secret: secret, _idx: idx, _tokens: tokens, _status: status, _error: (error ?? "").slice(0, 300) });
  } catch { /* não bloqueia a resposta */ }
}

export type Upstream = { res: Response; provider: string; upstreamModel: string; onUsage: (tokens: number, status: number, error?: string) => Promise<void> };

async function tryAccount(account: Account, upstreamModel: string, body: unknown, signal?: AbortSignal): Promise<Upstream> {
  const keys = await eligibleAccountKeys(account);
  if (!keys.length) throw new Error(`Fornecedor ${account.name} sem chave configurada`);
  const order = fallbackOrder(upstreamModel);
  const secret = account.api_secret_name;
  const start = rotation[secret] ?? 0;
  let last: Upstream | null = null;
  for (let i = 0; i < order.length; i++) {
    const m = order[i];
    if (!m) continue;
    for (let k = 0; k < keys.length; k++) {
      const pos = (start + k) % keys.length;
      const key = keys[pos];
      if (!key) continue;
      if (account.name === "Clean APIs" && rejectedCleanKeys.has(key.idx)) continue;
      const sendWith = (sig?: AbortSignal) => account.name === "SubtoAPI"
        ? fetchSubtoapi(account.base_url, key.value, withoutStore(body, m), sig)
        : fetch(providerChatUrl(account.base_url), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key.value}`, ...providerProxyHeaders(account.base_url) },
        body: JSON.stringify(account.name === FREE_AI_PROVIDER ? withNexaIdentity(withoutStore(body, m)) : withoutStore(body, m)),
        redirect: "manual",
        signal: sig ?? null,
      });
      const onUsage = (tokens: number, status: number, error?: string) => recordKey(secret, key.idx, tokens, status, error ?? null);
      // Streamed Anthropic requests must start answering within the deadline; otherwise the same
      // request is cancelled and sent again once. Answers that already started are never cut.
      const send = async (): Promise<Response> => {
        if (!firstByteDeadlineApplies(account.name, body)) return sendWith(signal);
        const attempts = 1 + FIRST_BYTE_RETRIES;
        for (let t = 1; t <= attempts; t++) {
          const res = await fetchWithFirstByteDeadline(sendWith, FIRST_BYTE_DEADLINE_MS, signal);
          if (res) return res;
          console.warn(`[upstream] ${account.name} sem início de resposta em ${FIRST_BYTE_DEADLINE_MS / 1000}s (tentativa ${t} de ${attempts})`);
          await onUsage(0, 524, "first_byte_timeout");
        }
        return new Response(firstByteTimeoutBody(account.name, FIRST_BYTE_DEADLINE_MS, attempts), { status: 524, headers: { "Content-Type": "application/json" } });
      };
      let res = await send();
      if (account.name === "Clean APIs" && res.status === 429) {
        const text = await res.clone().text().catch(() => "");
        if (isMinuteRateLimit(res.status, text)) {
          await onUsage(0, res.status, text);
          await res.body?.cancel();
          await waitForCleanRetry(signal);
          res = await send();
        }
      }
      if (res.ok) {
        rotation[secret] = pos + 1;
        if (account.name === FREE_AI_PROVIDER) res = rebrandResponse(res);
        return { res, provider: account.name, upstreamModel: m, onUsage };
      }
      const text = await res.clone().text().catch(() => "");
      last = { res, provider: account.name, upstreamModel: m, onUsage };
      // A shared hourly input limit is not exhausted credit: never rotate keys/models.
      if (isNexxusHourlyLimit(account.name, res.status, text)) return last;
      if (account.name === "Clean APIs" && (res.status === 401 || isQuotaError(res.status, text))) {
        rejectedCleanKeys.add(key.idx);
        await recordKey(secret, key.idx, 0, res.status, res.status === 401 ? "invalid_credentials" : "no_credit");
        continue;
      }
      if (isQuotaError(res.status, text)) {
        void recordKey(secret, key.idx, 0, res.status, text);
        if (k < keys.length - 1) {
          console.warn(`[upstream] chave ${key.idx} de ${account.name} sem crédito (${res.status}); tentando a próxima`);
          continue;
        }
        if (i < order.length - 1) break;
        return last;
      }
      return last;
    }
  }
  if (last) return last;
  throw new Error(`Fornecedor ${account.name} sem resposta disponível`);
}

// Retorna a resposta do fornecedor, o nome interno do modelo usado (para mascarar) e
// um registrador de consumo por chave do fornecedor.
async function cooledHops(hops: Hop[]): Promise<Set<string>> {
  if (!hops.length) return new Set();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("provider_model_cooldowns").select("provider, model")
      .in("provider", hops.map((h) => h.account.name)).gt("until", new Date().toISOString());
    return new Set((data ?? []).map((row) => cooldownKey(row.provider, row.model)));
  } catch { return new Set(); }
}

// Fornecedores com limite fixo por janela (ex.: Nexxus 107M a cada 2h) já esgotado.
// Em falha da consulta, segue normal: o 429 do próprio fornecedor ainda pausa.
async function windowExhausted(): Promise<Set<string>> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("provider_window_exhausted");
    if (error) return new Set();
    return new Set((data ?? []).map((row: { name: string }) => row.name));
  } catch { return new Set(); }
}

async function coolDown(provider: string, model: string, status: number, until = Date.now() + COOLDOWN_MS) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("provider_model_cooldowns").upsert({ provider, model, last_status: status,
      until: new Date(until).toISOString(), updated_at: new Date().toISOString() });
  } catch { /* não bloqueia a troca */ }
}

export async function fetchUpstream(body: unknown, signal?: AbortSignal, forcedProvider?: string | null, failures: ProviderFailure[] = []): Promise<Upstream> {
  const model = String((body as { model?: unknown })?.model ?? "");
  const route = await resolveRoute(model, forcedProvider);
  const chain = expandDevhubCombos(route.chain, model);
  // Fornecedor só entra na fila se tiver chave: no arquivo de configuração ou cadastrada pelo painel.
  const { providerSecret } = await import("./provider-secrets.server");
  const hasKey = await Promise.all(chain.map(async (hop) => accountKeys(hop.account.api_secret_name).length > 0 || Boolean(await providerSecret(hop.account.api_secret_name))));
  const usable = chain.filter((_, i) => hasKey[i]);
  // Quem falhou recentemente neste modelo vai para o fim da fila; o próximo pedido já começa no seguinte.
  const [cooled, exhausted] = await Promise.all([cooledHops(usable), usable.length ? windowExhausted() : Promise.resolve(new Set<string>())]);
  const paused = new Set(usable.filter(hop => exhausted.has(hop.account.name) || cooled.has(cooldownKey(hop.account.name, PROVIDER_QUOTA_MODEL))).map(hop => hop.account.name));
  const hops = withOutageCombo(orderByCooldown(skipHourlyPaused(usable.map(hop => (hop.combo ? hop : { ...hop, requestedModel: model })), paused), cooled));
  const multi = hops.length > 1;

  let firstFailure: Upstream | null = null;
  for (const hop of hops) {
    const account = hop.account;
    const upstreamModel = hop.upstreamModel;
    // Combo hops rest only the inner model that failed, so the next request starts on the next one.
    const coolPublic = (status: number) => hop.combo ? Promise.resolve() : coolDown(account.name, model, status);
    // Combo models rest only briefly, so one short supplier blip never moves the principal behind its backup for long.
    const coolInner = (status: number) => coolDown(account.name, upstreamModel, status, Date.now() + (hop.combo ? COMBO_COOLDOWN_MS : COOLDOWN_MS));
    const started = Date.now();
    const panelKey = await providerSecret(account.api_secret_name);
    const sanitize = (text: string) => sanitizeProviderCause(text, [...accountKeys(account.api_secret_name).map((key) => key.value), panelKey || '', process.env['NEXA_PROXY_ACCESS_TOKEN'] || '', process.env['LOVABLE_API_KEY'] || '']);
    try {
      let attempt = await tryAccount(account, upstreamModel, body, signal);
      // HTTP 200 followed only by an SSE error is a failure while nothing reached the client yet.
      if (attempt.res.ok && multi && (body as { stream?: unknown })?.stream === true && attempt.res.body) {
        const peek = await peekStreamStart(attempt.res.body).catch((error: unknown) => {
          if (signal?.aborted) throw error;
          return { ok: false as const, status: 502, errorText: String(error).slice(0, 500) };
        });
        attempt = { ...attempt, res: peek.ok
          ? new Response(peek.body, { status: attempt.res.status, statusText: attempt.res.statusText, headers: attempt.res.headers })
          : new Response(peek.errorText, { status: peek.status, headers: { "Content-Type": "application/json" } }) };
        if (!peek.ok) await attempt.onUsage(0, peek.status, peek.errorText);
      }
      const failText = attempt.res.ok ? "" : await attempt.res.clone().text().catch(() => "");
      const hourlyLimited = isNexxusHourlyLimit(account.name, attempt.res.status, failText);
      const rateLimited = attempt.res.status === 429 && isMinuteRateLimit(429, failText);
      // Saldo esgotado no fornecedor inteiro (todas as chaves já tentadas): passa ao próximo.
      const outOfCredit = !attempt.res.ok && !hourlyLimited && isQuotaError(attempt.res.status, failText);
      if (attempt.res.ok) {
        let res = attempt.res;
        if ((body as { stream?: unknown })?.stream === true && res.body) {
          res = new Response(dropErrorAfterFinish(res.body), { status: res.status, statusText: res.statusText, headers: res.headers });
        }
        if ((body as { stream?: unknown })?.stream === true && res.body && multi) {
          const reader = res.body.getReader();
          res = new Response(new ReadableStream<Uint8Array>({
            async pull(controller) {
              try {
                const { done, value } = await reader.read();
                if (done) controller.close(); else controller.enqueue(value);
              } catch (error) {
                if (!signal?.aborted) {
                  await coolPublic(502);
                  await coolInner(502);
                }
                controller.error(error);
              }
            },
            cancel(reason) { return reader.cancel(reason); },
          }), { status: res.status, statusText: res.statusText, headers: res.headers });
        }
        return { ...attempt, res, onUsage: async (tokens, status, error) => {
        // Stream failures happen after HTTP 200; persist them for the next request too.
        if (status >= 400 && status !== 499 && multi) {
          await coolPublic(status);
          await coolInner(status);
        }
        await attempt.onUsage(tokens, status, error);
        } };
      }
      failures.push({ provider: account.name, model: upstreamModel, status: attempt.res.status, latencyMs: Date.now() - started, cause: sanitize(failText || `HTTP ${attempt.res.status}: fornecedor sem resposta válida`) });
      // Toda recusa do fornecedor tenta a próxima reserva, inclusive 400/401/403/429.
      // Autenticação, saldo, validade, modelos permitidos e RPM do cliente já foram
      // verificados antes desta função e nunca são contornados pela troca.
      if (hourlyLimited) {
        await coolDown(account.name, PROVIDER_QUOTA_MODEL, attempt.res.status, nexxusHourlyReset(attempt.res.headers));
        await attempt.onUsage(0, attempt.res.status, 'hourly_input_token_limit');
      } else if (multi) {
        await coolPublic(attempt.res.status);
        await coolInner(attempt.res.status);
      }
      if (rateLimited) {
        await attempt.onUsage(0, 429, failText);
        // O próximo fornecedor é independente: passar na hora, sem repetir em ciclo.
        if (signal?.aborted) throw signal.reason;
      }
      console.warn(`[upstream] ${account.name} ${hourlyLimited ? "no limite horário" : outOfCredit ? "sem saldo" : rateLimited ? "no limite temporário" : "falhou"} (${attempt.res.status}); tentando o próximo fornecedor`);
      firstFailure ??= attempt;
    } catch (e) {
      if (signal?.aborted) throw e;
      const cause = sanitize(String(e));
      failures.push({ provider: account.name, model: upstreamModel, status: 502, latencyMs: Date.now() - started, cause });
      if (multi) {
        await coolPublic(502);
        await coolInner(502);
      }
      console.warn(`[upstream] ${account.name} sem resposta (${cause}); tentando o próximo fornecedor`);
    }
  }
  if (firstFailure) return firstFailure;
  if (paused.size && !hops.length) throw new Error("Fornecedor temporariamente no limite horário; aguarde a renovação.");
  throw new Error("Nenhum fornecedor disponível");
}

// Substitui o nome interno do modelo pelo nome público em um payload JSON de streaming.
export function maskUpstreamModel(chunk: string, upstreamModel: string, publicModel: string): string {
  return chunk.replace(/"model"\s*:\s*"[^"\\]*(?:\\.[^"\\]*)*"/g, `"model":${JSON.stringify(publicModel)}`);
}

/** Drops the OpenAI-only `store` field, which some providers reject with HTTP 400. */
export function withoutStore(body: unknown, model: string): Record<string, unknown> {
  const { store: _store, ...rest } = (body ?? {}) as Record<string, unknown>;
  return { ...rest, model };
}
