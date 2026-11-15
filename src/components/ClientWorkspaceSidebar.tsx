import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  KeyRound,
  BarChart3,
  Layers,
  Store,
  CreditCard,
  Braces,
  LifeBuoy,
  MessageSquare,
  ArrowUpRight,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  LogOut,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientIdentity } from "./client-auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getClientDashboard } from "@/lib/client-dashboard.functions";
import { CLIENT_DASHBOARD_QUERY_POLICY } from "@/lib/client-dashboard-query";
import { clientQuota } from "@/lib/client-quota";
import { useLang } from "@/lib/i18n";
import logoAsset from "@/assets/nexus/nexa-logo.png.asset.json";
import { getOwnAdminVisibility } from "@/lib/admin-access.functions";

const sections = [
  { id: "painel", label: "Visão geral", icon: Home },
  { id: "uso", label: "Uso", icon: BarChart3 },
  { id: "modelos", label: "Modelos", icon: Layers },
  { id: "chaves", label: "Chaves de API", icon: KeyRound },
  { id: "api", label: "Acesso à API", icon: Braces },
];
const accountSections = [
  { id: "plano", label: "Seu plano", icon: Store },
  { id: "faturas", label: "Faturas", icon: CreditCard },
  { id: "conta", label: "Conta", icon: UserRound },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
];
const format = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export function ClientWorkspaceSidebar({
  active,
  open = false,
  onSelect,
}: {
  active: string;
  open?: boolean;
  onSelect?: ((id: string) => void) | undefined;
}) {
  const { user } = useClientIdentity();
  const qc = useQueryClient();
  const { t } = useLang();
  const userId = user?.id ?? "";
  const { data, error, isPending } = useQuery({
    ...CLIENT_DASHBOARD_QUERY_POLICY,
    queryKey: ["client-dashboard", userId],
    queryFn: () => getClientDashboard(),
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
  const reseller = useQuery({
    queryKey: ["is-reseller", userId],
    queryFn: async () =>
      (await supabase.from("resellers").select("id").eq("user_id", userId).maybeSingle()).data,
    enabled: !!user,
  });
  const admin = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => getOwnAdminVisibility(),
    enabled: !!user,
    staleTime: 0,
    retry: false,
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
  });
  const name = String(
    data?.profile?.display_name ||
      data?.clientName ||
      user?.user_metadata?.["display_name"] ||
      user?.user_metadata?.["full_name"] ||
      "cliente",
  );
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "NX";
  const quota = clientQuota(data?.keys[0], data?.latestKeyTodayUsed);
  async function logout() {
    await qc.cancelQueries({ queryKey: ["client-dashboard"] });
    await supabase.auth.signOut();
    qc.removeQueries({ queryKey: ["client-dashboard"] });
  }
  const alexaLink = (
    <Button variant="ghost" className={active === "assistente" ? "is-active" : ""} asChild>
          <Link to="/assistente" aria-current={active === "assistente" ? "page" : undefined}>
            <MessageSquare />
            Nexa Chat
            <ArrowUpRight />
          </Link>
        </Button>
  );
  return (
    <aside className={`client-workspace-sidebar ${open ? "is-open" : ""}`}>
      <div className="client-workspace-brand">
        <Link to="/" className="brand">
          <img src={logoAsset.url} alt="NEXA" />
          NEXA <em>CLOUD</em>
        </Link>
      </div>
      <nav className="client-workspace-nav" aria-label="Seções do painel">
        {sections.flatMap(({ id, label, icon: Icon }) => [
          onSelect ? (
            <Button
              key={id}
              variant="ghost"
              className={`${active === id ? "is-active" : ""} ${id === "chaves" || id === "suporte" ? "client-nav-divider" : ""}`}
              onClick={() => onSelect(id)}
              aria-pressed={active === id}
            >
              <Icon />
              {t(label)}
            </Button>
          ) : (
            <Button key={id} variant="ghost" className={id === "chaves" || id === "suporte" ? "client-nav-divider" : ""} asChild>
              <Link to="/minha-chave" search={{ section: label }}>
                <Icon />
                {t(label)}
              </Link>
            </Button>
          ),
          id === "modelos" ? <span key="alexa" className="contents">{alexaLink}</span> : null,
        ])}
        <Button variant="ghost" asChild>
          <Link to="/docs">
            <BookOpen />
            Documentação API
          </Link>
        </Button>
        {accountSections.map(({ id, label, icon: Icon }) =>
          onSelect ? (
            <Button key={id} variant="ghost" className={`${active === id ? "is-active" : ""} ${id === "plano" ? "client-nav-divider" : ""}`} onClick={() => onSelect(id)} aria-pressed={active === id}>
              <Icon />{t(label)}
            </Button>
          ) : (
            <Button key={id} variant="ghost" className={id === "plano" ? "client-nav-divider" : ""} asChild>
              <Link to="/minha-chave" search={{ section: label }}><Icon />{t(label)}</Link>
            </Button>
          ),
        )}
        {reseller.data && (
          <Button variant="ghost" className="client-nav-divider" asChild>
            <Link to="/revenda">
              <Store />
              Painel revenda
            </Link>
          </Button>
        )}
        {user && admin.data === true && !admin.error && (
          <Button variant="ghost" asChild>
            <Link to="/admin">
              <ShieldCheck />
              Painel admin
            </Link>
          </Button>
        )}
      </nav>
      <div className="client-workspace-bottom">
        <div className="client-workspace-quota">
          <small>SUA CONTA NEXA</small>
          <strong>
            {isPending
              ? "Carregando…"
              : error
                ? "Consumo indisponível"
                : quota
                  ? quota.limit != null
                    ? `${format(quota.limit)} tokens${quota.daily ? "/dia" : ""}`
                    : "Plano por período"
                  : "Sem plano contratado"}
          </strong>
          {!isPending && !error && quota && (
            <>
              <small>
                {format(quota.used)} utilizados{quota.daily ? " hoje" : ""}
              </small>
              {quota.limit != null && (
                <progress
                  className="business-progress"
                  max={quota.limit || 1}
                  value={quota.progress}
                  aria-label={
                    quota.daily ? "Consumo diário de tokens" : "Consumo dos tokens comprados"
                  }
                />
              )}
            </>
          )}
          {onSelect ? (
            <Button variant="outline" size="sm" onClick={() => onSelect("plano")}>
              Ver meu plano <ArrowRight />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/minha-chave" search={{ section: "Seu plano" }}>
                Ver meu plano <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
        <div className="client-workspace-profile">
          <span className="client-avatar">{initials}</span>
          <div>
            <strong>{name}</strong>
            <small>{data?.email || user?.email}</small>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void logout()}
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </aside>
  );
}
