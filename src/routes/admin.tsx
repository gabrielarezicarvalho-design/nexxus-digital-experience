import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Package, Cpu, ScrollText, ShieldCheck, Settings, LogOut, Server, DatabaseZap, UserCog, Store, PanelLeftClose, PanelLeftOpen, Menu, X, ChartNoAxesCombined, Wallet, Ticket, Layers, Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminAccess, recordAdminAccess } from "@/lib/admin-access.functions";
import { useServerFn } from '@tanstack/react-start';
import { Button } from "@/components/ui/button";
import logo from "@/assets/nexus/nexa-logo.png.asset.json";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel admin — NEXA CLOUD" },
      { name: "description", content: "Gerencie clientes, chaves de API e consumo de tokens da NEXA CLOUD." },
      { property: "og:title", content: "Painel admin — NEXA CLOUD" },
      { property: "og:description", content: "Gerencie clientes, chaves de API e consumo de tokens da NEXA CLOUD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    try {
      return await getAdminAccess();
    } catch {
      throw redirect({ to: "/admin-login", replace: true });
    }
  },
  staleTime: 0,
  component: AdminLayout,
});

const MENU = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/metricas", label: "Métricas", icon: ChartNoAxesCombined },
  { to: "/admin/clientes", label: "Clientes e chaves", icon: Users },
  { to: "/admin/revenda", label: "Revenda", icon: Store },
  { to: "/admin/faturamento", label: "Faturamento", icon: Wallet },
  { to: "/admin/planos", label: "Planos", icon: Package },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/modelos", label: "Modelos", icon: Cpu },
  { to: "/admin/fornecedores", label: "Fornecedores", icon: DatabaseZap },
  { to: "/admin/combos", label: "Combos", icon: Layers },
  { to: "/admin/chamadas", label: "Chamadas", icon: Activity },
  { to: "/admin/logs", label: "Uso / Logs", icon: ScrollText },
  { to: "/admin/infraestrutura", label: "Infraestrutura", icon: Server },
  { to: "/admin/auditoria", label: "Auditoria", icon: ShieldCheck },
  { to: "/admin/administracao", label: "Administração", icon: UserCog },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

function AdminLayout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const recordEntrance = useServerFn(recordAdminAccess);
  const entrance = useRef<{ userId: string; id: string; pending?: Promise<{ ok: boolean }> } | null>(null);
  const [recordedUser, setRecordedUser] = useState('');
  const [recordError, setRecordError] = useState(false);
  const [recordAttempt, setRecordAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (entrance.current?.userId !== user.id) entrance.current = { userId: user.id, id: crypto.randomUUID() };
    const entry = entrance.current;
    setRecordError(false);
    entry.pending ??= recordEntrance({ data: { entryId: entry.id } });
    void entry.pending.then(() => { if (active) setRecordedUser(user.id); }).catch(() => {
      delete entry.pending;
      if (active) setRecordError(true);
    });
    return () => { active = false; };
  }, [user.id, recordEntrance, recordAttempt]);
  const access = useQuery({ queryKey: ["admin-access", user.id], queryFn: () => getAdminAccess(), staleTime: 0, retry: false, refetchInterval: 30000, refetchOnWindowFocus: "always" });
  useEffect(() => {
    if (!access.error) return;
    void qc.cancelQueries().then(() => { qc.clear(); void nav({ to: "/admin-login", replace: true }); });
  }, [access.error, nav, qc]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["admin-sidebar-profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()).data,
  });
  const email = user.email || "";
  const displayName = profile?.display_name || user.user_metadata?.['name'] || user.user_metadata?.['full_name'] || "";
  const name = displayName || "Administrador";
  const groups = [
    { label: "Principal", items: MENU.slice(0, 2) },
    { label: "Gestão", items: MENU.slice(2, 10) },
    { label: "Sistema", items: MENU.slice(10) },
  ];
  if (access.error) return null;
  return (
    <div className="min-h-screen bg-muted/40 font-sans text-foreground md:flex">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside aria-label="Barra lateral administrativa" className={`${mobileOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-56 shrink-0 flex-col border-r border-border bg-card md:sticky md:top-0 md:z-20 md:flex md:h-dvh ${collapsed ? "md:w-16" : "md:w-56"}`}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <img src={logo.url} alt="" className="size-7 shrink-0 object-contain" />
          <span className={`whitespace-nowrap text-[13px] font-bold ${collapsed ? "md:hidden" : ""}`}>NEXA CLOUD <span className="text-accent">ADMIN</span></span>
          <Button variant="ghost" size="icon" className="ml-auto size-7 shrink-0 md:hidden" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X /></Button>
        </div>
        <nav aria-label="Navegação administrativa" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:none] [scrollbar-color:var(--orange)_transparent]">
          {groups.map(group => <div key={group.label} className="mb-3 last:mb-0">
            <p className={`mb-1 px-2 text-[10px] font-semibold uppercase text-muted-foreground ${collapsed ? "md:hidden" : ""}`}>{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(m => <Link key={m.to} to={m.to} activeOptions={{ exact: "exact" in m }} title={m.label} onClick={() => setMobileOpen(false)}
                className={`flex h-8 items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted ${collapsed ? "md:justify-center md:px-0" : ""}`}
                activeProps={{ className: "bg-accent/10 text-accent font-semibold" }}>
                <m.icon className="size-[18px] shrink-0" /><span className={collapsed ? "md:hidden" : ""}>{m.label}</span>
              </Link>)}
            </div>
          </div>)}
        </nav>
        <footer className="shrink-0 border-t border-border px-3 py-3">
          <p className={`mb-2 flex items-center gap-2 text-[10px] font-semibold text-accent ${collapsed ? "md:justify-center" : ""}`} title="SISTEMA ONLINE · v2.1.0"><span className="size-2 shrink-0 rounded-full bg-accent ring-2 ring-accent/20" /><span className={`whitespace-nowrap ${collapsed ? "md:hidden" : ""}`}>SISTEMA ONLINE · v2.1.0</span></p>
          <div className={`flex items-center gap-1.5 ${collapsed ? "md:flex-col md:gap-2" : ""}`}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent" title={name}>{name.charAt(0).toUpperCase()}</span>
            <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}><p className="truncate text-sm font-semibold" title={name}>{name}</p><p className="truncate text-[10px] text-muted-foreground" title={email}>{email || "Administrador"}</p></div>
            <Button variant="ghost" size="icon" title="Sair da conta" aria-label="Sair da conta" className="size-8 shrink-0 text-muted-foreground" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await nav({ to: "/admin-login", replace: true }); }}><LogOut /></Button>
          </div>
        </footer>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-12 items-center border-b border-border bg-card px-4 md:px-8">
          <Button variant="ghost" size="icon" className="hidden size-8 text-muted-foreground md:inline-flex" title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          <Button variant="ghost" size="icon" className="size-8 md:hidden" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu /></Button>
          <span className="ml-3 text-xs font-medium text-muted-foreground">NEXA CLOUD · Administração</span>
        </header>
        <main className="min-w-0 p-4 md:p-8">{recordedUser === user.id ? <Outlet /> : recordError ? <div role="alert" className="space-y-3"><p className="text-destructive">Não foi possível registrar seu acesso ao Admin.</p><Button variant="outline" onClick={() => setRecordAttempt(value => value + 1)}>Tentar novamente</Button></div> : <p role="status" className="text-muted-foreground">Registrando acesso…</p>}</main>
      </div>
    </div>
  );
}
