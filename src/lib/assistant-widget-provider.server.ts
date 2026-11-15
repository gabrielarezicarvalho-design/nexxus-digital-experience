import { createOpenAI } from "@ai-sdk/openai";
import { providerProxyHeaders } from "./provider-transport.server";

export const WIDGET_PROVIDER = "Anthropic Revenda";
export const WIDGET_MODEL = "claude-sonnet-5";

type WidgetAccount = { name: string; active: boolean; paused: boolean; base_url: string; api_secret_name: string; available_models: string[] | null };

export function widgetAccount(accounts: WidgetAccount[]) {
  const account = accounts.find((row) => row.name === WIDGET_PROVIDER && row.active && !row.paused);
  if (!account || !account.available_models?.includes(WIDGET_MODEL)) {
    throw new Error("Atendimento temporariamente indisponível. Fale com o suporte pelo WhatsApp.");
  }
  return account;
}

// Only called after the assistant endpoint has authenticated the user and checked thread ownership.
export async function widgetLanguageModel() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("provider_accounts")
    .select("name, active, paused, base_url, api_secret_name, available_models").eq("name", WIDGET_PROVIDER);
  if (error) throw new Error("Não foi possível abrir o atendimento agora.");
  const account = widgetAccount(data ?? []);
  const apiKey = process.env[account.api_secret_name];
  if (!apiKey) throw new Error("Atendimento não configurado. Fale com o suporte pelo WhatsApp.");
  const provider = createOpenAI({
    baseURL: account.base_url.replace(/\/+$/, ""),
    apiKey,
    headers: providerProxyHeaders(account.base_url),
    fetch: async (input, init) => {
      const response = await fetch(input, { ...init, redirect: "manual" });
      if (response.status >= 300 && response.status < 400) {
        throw new Error("Não foi possível conectar ao atendimento com segurança.");
      }
      return response;
    },
  });
  return provider.chat(WIDGET_MODEL);
}