import { useQuery } from "@tanstack/react-query";
import { providerNoticeQueryOptions } from "@/lib/provider-notice-query";
import { useLang } from "@/lib/i18n";

export function ProviderNotice() {
  const { t } = useLang();
  const { data: enabled } = useQuery(providerNoticeQueryOptions);
  if (!enabled) return null;
  return (
    <div className="provider-notice" role="status">
      <span className="provider-notice-dot" aria-hidden />
      {t("Instabilidade no fornecedor de IA: as respostas podem falhar ou demorar. Já estamos acompanhando e tudo volta ao normal automaticamente.")}
    </div>
  );
}
