import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Panel } from "@/lib/admin-ui";
import { pageHead } from '@/lib/page-head';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Switch } from "@/components/ui/switch";
import { providerNoticeQueryOptions } from "@/lib/provider-notice-query";
import { adminSetProviderNotice } from "@/lib/site-notices.functions";

export const Route = createFileRoute("/admin/configuracoes")({ head: () => pageHead('Configurações', 'Endereços de conexão e configurações NEXA CLOUD.'), component: Config });

function Config() {
  const queryClient = useQueryClient();
  const notice = useQuery(providerNoticeQueryOptions);
  const saveNotice = useServerFn(adminSetProviderNotice);
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => saveNotice({ data: { enabled } }),
    onSuccess: ({ enabled }) => {
      queryClient.setQueryData(providerNoticeQueryOptions.queryKey, enabled);
    },
  });
  const base = typeof window !== "undefined" ? `${window.location.origin}/api/public/v1` : "";
  return (
    <>
      <PageTitle title="Configurações" />
      <Panel className="mb-6">
        <div className="flex items-center justify-between gap-5">
          <div>
            <label id="provider-notice-title" htmlFor="provider-notice-toggle" className="font-semibold">Aviso de instabilidade do fornecedor</label>
            <p className="mt-1 text-sm text-muted-foreground">Página inicial e painel do cliente</p>
            <p className="mt-2 text-sm text-muted-foreground" role="status">{mutation.isPending ? "Salvando…" : notice.isLoading ? "Carregando…" : notice.isError ? "Aviso indisponível" : notice.data ? "Aviso ligado" : "Aviso desligado"}</p>
          </div>
          <Switch id="provider-notice-toggle" checked={notice.data === true} disabled={notice.isLoading || notice.isError || mutation.isPending} onCheckedChange={(enabled) => mutation.mutate(enabled)} className="data-[state=checked]:bg-accent" />
        </div>
        {(mutation.isError || notice.isError) && <p role="alert" className="mt-3 text-sm text-destructive">{mutation.error?.message ?? "Não foi possível carregar o aviso. Tente novamente."}</p>}
      </Panel>
      <Panel className="grid gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Base URL para os clientes</p><code className="break-all">{base}</code></div>
        <div><p className="text-xs text-muted-foreground">Endpoint</p><code>POST /chat/completions</code> · <code>GET /models</code></div>
        <div><p className="text-xs text-muted-foreground">Provedor</p><code>https://www.codecraftapi.com/v1</code></div>
        <p className="text-muted-foreground">A chave principal da CodeCraft fica guardada com segurança no servidor e nunca aparece no site. Limites padrão por minuto são definidos em Planos.</p>
      </Panel>
    </>
  );
}
