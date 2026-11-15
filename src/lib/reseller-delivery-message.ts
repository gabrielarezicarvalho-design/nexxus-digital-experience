import { RESELLER_BASE, RESELLER_ORIGIN } from "./reseller-domain";

export const KEY_PLACEHOLDER = "{chave}";

export function canEditDeliveryMessage(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === "jbtoolss7@gmail.com";
}

export const DEFAULT_DELIVERY_TEMPLATE = `🎥 Vídeo Tutorial: https://tultorialfbgg.lovable.app

━━━━━━━━━━━━━━━━

🌐 URL Base: ${RESELLER_BASE}

🔑 API Key: {chave}

📊 Consultar Consumo: ${RESELLER_ORIGIN}/consumo

━━━━━━━━━━━━━━━━

⚠️ INFORMAÇÕES IMPORTANTES

🔒 Seu acesso é pessoal e exclusivo.

🚫 Não compartilhe sua API Key com terceiros.

📊 Acompanhe seus gastos e consumo pelo link acima.

✅ Se nos avaliar positivamente liberamos mais 20 milhões de bônus !

💬 Precisou de ajuda? Entre em contato com nosso suporte!`;

/** Texto salvo pela revenda (ou o padrão), com {chave} trocado pela chave nova. */
export function resellerDeliveryMessage(email: string | null | undefined, key: string, template?: string | null): string | null {
  if (!canEditDeliveryMessage(email)) return null;
  const text = template?.trim() ? template : DEFAULT_DELIVERY_TEMPLATE;
  return text.includes(KEY_PLACEHOLDER) ? text.split(KEY_PLACEHOLDER).join(key) : `${text}\n\n🔑 API Key: ${key}`;
}

const GGMAX_EMAIL = "bruebielcasal@gmail.com";

export const GGMAX_DELIVERY_TEMPLATE = `🎥 Vídeo Tutorial: https://youtu.be/7DyTxYUXCrw?is=gtn5CIon48QwrP3L

━━━━━━━━━━━━━━━━

🌐 URL Base: https://cloudnexapro.site/api/public

🔑 API Key: {chave}

📊 Consultar Consumo: https://apirevenda.site/consumo

━━━━━━━━━━━━━━━━

⚠️ INFORMAÇÕES IMPORTANTES

🔒 Seu acesso é pessoal e exclusivo.

🚫 Não compartilhe sua API Key com terceiros.

🚫 Não utilize vpn para ativação ( BLOQUEIA )

📊 Acompanhe seus gastos e consumo pelo link acima.

✅ Se nos avaliar positivamente liberamos mais 20 milhões de bônus !

💬 Precisou de ajuda? Entre em contato com nosso suporte!`;

/** Mensagem padrão das chaves criadas pelo administrador para a conta ggmax. */
export function adminDeliveryMessage(clientEmail: string | null | undefined, key: string): string | null {
  if (clientEmail?.trim().toLowerCase() !== GGMAX_EMAIL) return null;
  return GGMAX_DELIVERY_TEMPLATE.split(KEY_PLACEHOLDER).join(key);
}
