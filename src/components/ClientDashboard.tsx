import { ClientWorkspaceSidebar } from "./ClientWorkspaceSidebar";
import { ClientUsageCards } from './ClientUsageCards';
import { PlanUsageCards } from './PlanUsageCards';
import { ClientModels } from './ClientModels';
import { SitePlans } from './SitePlans';
import { showFirstPlanCatalog } from '@/lib/client-plan-selection';
import { ModelBrandIcon } from './ModelBrandIcon';
import { ProviderNotice } from "@/components/ProviderNotice";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/lib/i18n";
import { useState } from 'react';
import { apiModelLabel } from '@/lib/astra-alias';
import type { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CreditCard, Home, LifeBuoy, Menu, MonitorDown, Settings, X, ArrowRight, ArrowUpRight, BookOpen, Check, Copy, Eye, EyeOff, Info, KeyRound, LogOut, MessageSquare, RefreshCw, Gauge, ShieldCheck, Sparkles, Store, Braces, PlugZap, Activity, Zap, Layers, PiggyBank, Receipt, Clock3, XCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getClientDashboard } from '@/lib/client-dashboard.functions';
import { CLIENT_DASHBOARD_QUERY_POLICY } from '@/lib/client-dashboard-query';
import { fillUsageDays, modelPeriodRows } from '@/lib/client-usage';
import { savingsSummary } from '@/lib/usage-savings';
import { WindowsAppCard } from './WindowsAppCard';
import { TokenUpgradeDialog } from './TokenUpgradeDialog';
import { canUpgradeTokens } from '@/lib/token-upgrade';
import { canBuyDailyReset } from '@/lib/daily-limit-reset';
import { DailyResetDialog } from './DailyResetDialog';
import { ClientApiAccess } from './ClientApiAccess';
import { clientQuota } from '@/lib/client-quota';
import { DailyLimitCard } from '@/components/DailyLimitCard';
import logoAsset from '@/assets/nexus/nexa-logo.png.asset.json';

const logo = logoAsset.url;
const BASE = 'https://api.cloudnexa.com.br';
const SUPPORT = 'https://chat.whatsapp.com/EVdOAcdCyRlBQKfA0PkK9O?s=cl&p=a&iam=2';
const TABS = [{ id: 'painel', label: 'Visão geral', icon: Home }, { id: 'chaves', label: 'Chaves de API', icon: KeyRound }, { id: 'uso', label: 'Uso', icon: BarChart3 }, { id: 'modelos', label: 'Modelos', icon: Layers }, { id: 'plano', label: 'Seu plano', icon: Store }, { id: 'faturas', label: 'Faturamento', icon: CreditCard }, { id: 'api', label: 'Acesso à API', icon: Braces }, { id: 'conta', label: 'Configurações', icon: Settings }, { id: 'suporte', label: 'Suporte', icon: LifeBuoy }];
const FATURA_STATUS: Record<string, string> = { approved: 'Aprovado', pending: 'Pendente', in_process: 'Em análise', rejected: 'Recusado', cancelled: 'Cancelado', error: 'Erro' };
const format = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
const plural = (n: number, one: string, many: string) => `${format(n)} ${n === 1 ? one : many}`;
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const initials = (value: string) => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map(p => p[0]?.toUpperCase() ?? '').join('');
  return letters || 'NX';
};

export function ClientDashboard({ user, initialSection }: { user: User; initialSection?: string | undefined }) {
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch, isFetching } = useQuery({ ...CLIENT_DASHBOARD_QUERY_POLICY, queryKey: ['client-dashboard', user.id], queryFn: () => getClientDashboard(), refetchInterval: 10000, refetchOnWindowFocus: true });
  const reseller = useQuery({ queryKey: ['is-reseller', user.id], queryFn: async () => (await supabase.from('resellers').select('id').eq('user_id', user.id).maybeSingle()).data });
  const admin = useQuery({ queryKey: ['is-admin', user.id], queryFn: async () => (await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })).data === true });
  const [apiKeyId, setApiKeyId] = useState('');
  const { t } = useLang();
  const [tab, setTab] = useState(TABS.find(item => item.label === initialSection)?.id || 'painel');
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState(7);
  const [modelPeriod, setModelPeriod] = useState(7);
  const chartMetric = 'requests';
  const selectTab = (id: string) => { setTab(id); setMenuOpen(false); }; 
  const [copied, setCopied] = useState('');
  const [revealed, setRevealed] = useState<string[]>([]);
  const [copyError, setCopyError] = useState('');
  const [upgradeKeyId, setUpgradeKeyId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<{ id: string; plan: string } | null>(null);
  async function copy(value: string, id: string) {
    try { await navigator.clipboard.writeText(value); setCopied(id); setCopyError(''); setTimeout(() => setCopied(''), 2000); }
    catch { setCopyError('Não foi possível copiar. Selecione o texto e copie manualmente.'); }
  }
  async function logout() { await queryClient.cancelQueries({ queryKey: ['client-dashboard'] }); await supabase.auth.signOut(); queryClient.removeQueries({ queryKey: ['client-dashboard'] }); }
  const name = data?.profile?.display_name || data?.clientName || user.user_metadata?.['display_name'] || user.user_metadata?.['full_name'] || 'cliente';
  const usage = data?.usage;
  const keys = data?.keys ?? [];
  const firstPlan = showFirstPlanCatalog(keys);
  const quota = clientQuota(keys[0], data?.latestKeyTodayUsed);
  const activeKeys = keys.filter(k => k.status === 'active' && (!k.expires_at || new Date(k.expires_at) > new Date()) && (k.token_limit == null || k.tokens_used < k.token_limit));
  const apiKey = keys.find(k => k.id === apiKeyId) ?? activeKeys[0] ?? keys[0];
  const apiModelNames = apiKey ? data?.modelNamesByKey[apiKey.id] ?? [] : [];
  const models = { isPending, error, data: { data: apiModelNames.map(id => ({ id })) } };
  const commandModel = apiModelNames.find(id => id === 'claude-sonnet-5-5') ?? apiModelNames[0];
  const chartDays = fillUsageDays(usage?.daily ?? []).slice(-range);
  const periodRequests = chartDays.reduce((sum, d) => sum + d.requests, 0);
  const modelPeriodList = modelPeriodRows(usage?.daily_by_model ?? [], modelPeriod);
  const compact = (n: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const balancePlanCents = data?.planValueCents ?? null;
  const keyPricing = keys[0] ? data?.pricingByKey[keys[0].id] : undefined;
  const adjustedPrices = keyPricing?.prices ?? {};
  const savings = savingsSummary(keyPricing?.usage.by_model ?? [], keyPricing?.planCents ?? balancePlanCents, data?.basePrices ?? {}, keyPricing?.prices ?? null);
  const savingsMoney = (value: number | null) => value == null ? '—' : money(value);
  const savingsPeriod = keys[0]?.token_limit == null && (keys[0]?.daily_token_limit ?? 0) > 0 ? 'Uso de hoje da sua chave' : 'Uso acumulado da sua chave';

  const metrics = [
    { label: 'COMANDOS HOJE', value: usage?.today_requests ?? 0, note: 'Hoje · horário de Brasília', icon: MessageSquare, accent: true },
    { label: 'COMANDOS TOTAIS', value: usage?.total_requests ?? 0, note: 'Todos os pedidos registrados', icon: Activity, accent: false },
    { label: 'TOKENS PROCESSADOS', value: usage?.total_tokens ?? 0, note: 'Entrada + saída', icon: Zap, accent: false },
    { label: 'CHAVES ATIVAS', value: activeKeys.length, note: 'Credenciais disponíveis', icon: KeyRound, accent: false },
    { label: 'MODELOS USADOS', value: usage?.models_used ?? 0, note: 'Modelos distintos nos pedidos', icon: Layers, accent: false },
  ];

  return <div className="client-page client-workspace">
    {menuOpen && <Button variant="ghost" className="client-workspace-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <ClientWorkspaceSidebar active={tab} open={menuOpen} onSelect={selectTab} />
    <div className="client-workspace-content">
      <header className="client-workspace-topbar"><div><Button variant="ghost" size="icon-sm" className="client-workspace-menu" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</Button><h1>{t(TABS.find(item => item.id === tab)?.label || 'Visão geral')}</h1></div>
        <div><span className="client-workspace-plan-label">{data?.planLabel || 'Conta NEXA'}</span><Button variant="outline" size="sm" className="client-head-keys" onClick={() => selectTab('chaves')}><KeyRound />Chaves de API</Button>{firstPlan ? <Button className="client-primary" size="sm" onClick={() => selectTab('plano')}>Ver planos <ArrowRight /></Button> : <Button className="client-primary" size="sm" asChild><Link to="/">Ver planos <ArrowUpRight /></Link></Button>}<Button variant="ghost" size="icon-sm" onClick={() => void refetch()} disabled={isFetching} title="Atualizar consumo" aria-label="Atualizar consumo"><RefreshCw /></Button></div>
      </header>
      <main className="client-dashboard"><ProviderNotice />
      {copyError && <p className="client-error" role="alert">{copyError}</p>}
      {isPending ? <div className="client-empty">{t('Carregando suas chaves e consumo…')}</div> : error ? <div className="client-empty"><p role="alert">Não foi possível carregar seus dados.</p><Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div> : <>
        {tab === 'uso' && quota?.daily && quota.limit ? (() => { const k = keys[0]; return <div className="client-hourly-row"><DailyLimitCard used={quota.used} limit={quota.limit} plano={k?.plano ?? null} {...(k && canBuyDailyReset(k) ? { onReset: () => setResetKey({ id: k.id, plan: k.plano || 'mensal' }) } : {})} /></div>; })() : null}
        {tab === 'uso' && <ClientUsageCards usage={usage} prices={adjustedPrices} costUsage={keyPricing?.usage} activeKeys={activeKeys.length} onRefresh={() => void refetch()} refreshing={isFetching} calls={keyPricing?.usage.calls ?? []} cache={keyPricing?.usage.cache} afterHistory={<PlanUsageCards days={fillUsageDays(keyPricing?.usage.daily ?? [])} modelDays={keyPricing?.usage.daily_by_model ?? []} modelTotals={keyPricing?.usage.by_model ?? []} prices={adjustedPrices} planCents={keyPricing?.planCents ?? balancePlanCents} quota={keyPricing?.quota ?? quota} onStatement={() => selectTab('faturas')} />} />}
        {tab === 'modelos' && <ClientModels names={data?.catalogModelNames ?? []} keys={keys} basePrices={data?.basePrices ?? {}} pricingByKey={data?.pricingByKey ?? {}} />}
        {tab === 'painel' && <>
          {tab === 'painel' && <div className="client-greeting"><div><h2>{t('Olá')}, {String(name).split(' ')[0]}</h2><p>Seu consumo e suas conexões em um só lugar.</p></div><Button variant="outline" size="sm" onClick={() => selectTab('api')}><PlugZap />Conectar à API<ArrowRight /></Button></div>}
          <div className="client-metrics">{metrics.map(m => <article key={m.label} className={m.accent ? 'is-accent' : ''}><div><span>{t(m.label)}</span><i><m.icon size={16} /></i></div><strong>{format(m.value)}</strong><small>{t(m.note)}</small></article>)}</div>

          <div className="client-two-col client-overview-cols">
          <div className="client-overview-stack">
          <section className="client-section client-activity-chart"><div className="client-section-heading"><div><h2>{chartMetric === 'requests' ? 'Solicitações ao longo do tempo' : 'Tokens ao longo do tempo'}</h2><p>{format(periodRequests)} solicitações nos últimos {range} dias</p></div><div className="client-workspace-range">{[7,30].map(days => <Button key={days} variant="ghost" className={range === days ? 'is-active' : ''} onClick={() => setRange(days)} aria-pressed={range === days}>{days}d</Button>)}</div></div>
            <div className="client-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartDays} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="day" interval={range === 7 ? 0 : 4} tickFormatter={v => `${String(v).slice(8,10)}/${String(v).slice(5,7)}`} minTickGap={24} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis width={48} allowDecimals={false} tickFormatter={v => new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(Number(v))} tick={{ fill:'var(--muted-foreground)',fontSize:11 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={v => String(v).split('-').reverse().join('/')} /><Area type="monotone" dataKey={chartMetric} name={chartMetric === 'requests' ? 'Solicitações' : 'Tokens'} stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.08} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
          </section>
            <section className="client-section client-panel"><div className="client-section-heading"><h2>Uso por modelo</h2><Button variant="link" size="sm" onClick={() => selectTab('uso')}>Detalhes <ArrowRight /></Button></div><div className="client-workspace-table"><table><thead><tr><th>MODELO</th><th>SOLICITAÇÕES</th><th>TOKENS</th></tr></thead><tbody>{usage?.by_model.length ? usage.by_model.map(m => <tr key={m.model}><td><span className="client-calls-model"><ModelBrandIcon id={m.model} /><code>{m.model}</code></span></td><td>{format(m.requests)}</td><td>{format(m.tokens)}</td></tr>) : <tr><td colSpan={3}><div className="client-empty">Ainda não há uso registrado na sua conta.</div></td></tr>}</tbody></table></div></section>
          </div>
          <div className="client-overview-stack">
          <section className="client-section client-panel client-connect-card">
            <span className="client-connect-eyebrow">Do zero à primeira resposta</span>
            <h2>Conecte sua chave NEXA</h2>
            <p>Sua chave é liberada após a aprovação do PIX. Siga estes passos para usar seu plano na sua ferramenta.</p>
            <div className="client-connect-steps">
              <Button variant="ghost" onClick={() => selectTab('chaves')}><span className="client-connect-num">01</span><div><strong>Copie sua chave de API</strong><small>Abra Chaves de API e clique em Copiar chave. Não compartilhe sua chave.</small></div><ArrowUpRight size={16} /></Button>
              <Button variant="ghost" onClick={() => selectTab('api')}><span className="client-connect-num">02</span><div><strong>Configure a URL da NEXA</strong><small>Em Acesso à API, copie a URL: Claude Code usa Anthropic; OpenCode e apps GPT usam OpenAI.</small></div><ArrowUpRight size={16} /></Button>
              <Button variant="ghost" onClick={() => selectTab('plano')}><span className="client-connect-num">03</span><div><strong>Escolha um modelo do seu plano</strong><small>Copie o nome exato em Modelos do seu plano e cole na configuração da sua ferramenta.</small></div><ArrowUpRight size={16} /></Button>
              <Button variant="ghost" asChild><Link to="/docs"><span className="client-connect-num">04</span><div><strong>Envie sua primeira mensagem</strong><small>Siga o guia da sua ferramenta e envie “Olá”. Se der erro, consulte Erros comuns no guia.</small></div><ArrowUpRight size={16} /></Link></Button>
            </div>
          </section>
            <section className="client-section client-panel client-model-period"><div className="client-section-heading"><div><h2>Modelos no período</h2><p>{modelPeriod === 1 ? 'Hoje' : `Últimos ${modelPeriod} dias`} · tokens por modelo</p></div><div className="client-workspace-range">{[{ d: 1, label: 'Hoje' }, { d: 7, label: '7 dias' }, { d: 30, label: '30 dias' }].map(p => <Button key={p.d} variant="ghost" className={modelPeriod === p.d ? 'is-active' : ''} onClick={() => setModelPeriod(p.d)} aria-pressed={modelPeriod === p.d}>{p.label}</Button>)}</div></div>{modelPeriodList.length ? <div className="client-model-period-list">{modelPeriodList.map(m => <div key={m.model} className="client-model-period-row"><div className="client-model-period-head"><span className="client-calls-model"><ModelBrandIcon id={m.model} /><code>{m.model}</code></span><span>{compact(m.tokens)} · {m.percent}%</span></div><div className="client-model-period-bar"><i style={{ width: `${Math.max(m.percent, 1.5)}%` }} /></div><small>{plural(m.requests, 'requisição', 'requisições')}</small></div>)}</div> : <div className="client-empty">Ainda não há uso registrado no período.</div>}</section>
          </div>
          </div>

          <section className="client-section client-panel client-savings-card">
            <div className="client-section-heading"><div><h2>Quanto você economiza</h2><p>{savingsPeriod} · {keys[0]?.plano || 'Sem plano'} · economia estimada sobre os mesmos tokens consumidos</p></div></div>
            {keyPricing ? <>
              <div className="client-savings-hero"><span>Economia</span><div><strong>{savingsMoney(savings.savingsCents)}</strong>{savings.ratio && savings.ratio > 1 ? <em>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(savings.ratio)}× mais barato</em> : null}</div></div>
              <div className="client-savings-bars">
                <div><div className="client-savings-bar-label"><span>Pagando por token</span><strong>{savingsMoney(savings.payPerTokenCents)}</strong></div><div className="client-savings-bar"><i className="is-full" style={{ width: savings.payPerTokenCents ? '100%' : '0%' }} /></div></div>
                <div><div className="client-savings-bar-label"><span>Consumido da assinatura</span><strong>{savingsMoney(savings.consumedCents)}</strong></div><div className="client-savings-bar"><i style={{ width: `${savings.consumedCents != null && savings.payPerTokenCents ? Math.min(100, (savings.consumedCents / savings.payPerTokenCents) * 100) : 0}%` }} /></div></div>
                <div><div className="client-savings-bar-label"><span>Sua assinatura</span><strong>{savingsMoney(savings.subscriptionCents)}</strong></div><div className="client-savings-bar"><i style={{ width: `${savings.subscriptionCents != null && savings.payPerTokenCents ? Math.min(100, (savings.subscriptionCents / savings.payPerTokenCents) * 100) : 0}%` }} /></div></div>
              </div>
              <div className="client-savings-models">{savings.rows.map(r => <div key={r.model}><span className="client-savings-model-icon"><ModelBrandIcon id={r.model} /></span><strong title={r.model}>{r.model.replace(/^.*\//, '').replace(/-invision$/, '').replace(/^(?:claude|cloud|nexa)-/, 'Claude ').replace(/^(gpt)-/i, 'GPT-').replace(/5-5/g, '5.5').replace(/\b(opus|sonnet|fable|haiku|astra|terra|luna)\b/gi, word => word.charAt(0).toUpperCase() + word.slice(1)).replace(/(Opus|Sonnet|Fable|Haiku)-/, '$1 ')}</strong><small>{compact(r.tokens)} tokens</small><b>{savingsMoney(r.costCents)}</b></div>)}</div>
            </> : <div className="client-empty">Ainda não há uso registrado para calcular a economia.</div>}
          </section>
        </>}

        {tab === 'plano' && firstPlan && <section className="client-section gateway-home client-first-plan"><div className="client-section-heading"><div><h2>Escolha seu plano</h2><p>Claude, GPT ou os dois · pagamento via PIX</p></div></div><SitePlans customer={{ name: String(name), email: data?.email ?? user.email ?? '' }} onApproved={() => { void refetch(); }} /></section>}
        {tab === 'plano' && !firstPlan && (() => {
          const planKey = activeKeys[0] ?? keys[0];
          const planActive = planKey ? activeKeys.some(a => a.id === planKey.id) : false;
          const todayTokens = chartDays[chartDays.length - 1]?.tokens ?? 0;
          const dailyQ = planKey && planKey.id === keys[0]?.id && quota?.daily && quota.limit ? quota : null;
          const daysLeft = planKey?.expires_at ? Math.max(0, Math.ceil((new Date(planKey.expires_at).getTime() - Date.now()) / 86400000)) : null;
          return <section className="client-section"><div className="client-section-heading"><div><h2>Seu plano</h2><p>Limites e validade da sua chave</p></div><Button variant="link" asChild><Link to="/">Ver planos <ArrowUpRight /></Link></Button></div>
            <article className="client-plan-hero">
              <div className="client-plan-hero-left">
                <div className="client-plan-hero-top"><span className="client-plan-hero-icon"><Sparkles size={22} /></span><span className="client-badge">{planKey ? (planActive ? 'Ativa' : planKey.status === 'revoked' ? 'Revogada' : 'Indisponível') : 'Sem plano'}</span></div>
                <small>Plano atual</small>
                <h3>{planKey?.plano || 'Sem plano'}</h3>
                <p>{planKey ? 'Sua chave está liberada e pronta para uso.' : 'Assine um plano para liberar sua chave.'}</p>
                <dl className="client-plan-hero-facts">
                  <div><dt>Renova em</dt><dd>{planKey?.expires_at ? new Date(planKey.expires_at).toLocaleDateString('pt-BR') : '—'}</dd></div>
                  <div><dt>Dias restantes</dt><dd>{daysLeft != null ? `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : '—'}</dd></div>
                  <div><dt>Cliente desde</dt><dd>{new Date(data?.createdAt ?? user.created_at).toLocaleDateString('pt-BR')}</dd></div>
                  <div><dt>Requisições</dt><dd>{format(usage?.total_requests ?? 0)}</dd></div>
                </dl>
                {planKey && canUpgradeTokens(planKey) ? <Button className="client-primary client-plan-hero-cta" onClick={() => setUpgradeKeyId(planKey.id)}><Zap />Adicionar tokens</Button> : <div className="flex flex-wrap gap-2"><Button className="client-primary client-plan-hero-cta" asChild><Link to="/">{planKey ? 'Assinar outro plano' : 'Assinar um plano'}</Link></Button>{planKey && canBuyDailyReset(planKey) && <Button variant="outline" className="client-plan-hero-cta" onClick={() => setResetKey({ id: planKey.id, plan: planKey.plano || 'mensal' })}><RefreshCw />Resetar limite</Button>}</div>}
              </div>
              <div className="client-plan-hero-right">
                <div className="client-plan-hero-top"><small>{dailyQ ? 'Limite diário' : 'Consumo hoje'}</small><Button variant="outline" size="icon-sm" onClick={() => void refetch()} disabled={isFetching} title="Atualizar consumo" aria-label="Atualizar consumo"><Gauge /></Button></div>
                {dailyQ ? <DailyLimitCard used={dailyQ.used} limit={dailyQ.limit!} compact /> : <>
                <strong className="client-plan-hero-tokens">{format(todayTokens)} <small>{planKey?.token_limit == null ? 'tokens, sem teto' : `de ${format(planKey.token_limit)} tokens`}</small></strong>
                <Progress className="client-plan-hero-usage" value={planKey?.token_limit ? Math.min(100, (todayTokens / planKey.token_limit) * 100) : 0} aria-label="Consumo de tokens hoje" /></>}
                <p className="client-plan-hero-requests">{format(usage?.total_requests ?? 0)} requisições na conta</p>
                <div className="client-plan-hero-key"><span className="client-plan-hero-icon"><KeyRound size={22} /></span><div><small>Sua chave</small>{planKey ? <div className="client-plan-hero-keyrow"><code>{`${planKey.api_key.slice(0, 9)}${'•'.repeat(22)}${planKey.api_key.slice(-4)}`}</code><Button size="icon-sm" variant="outline" title="Copiar chave" aria-label="Copiar chave" onClick={() => void copy(planKey.api_key, 'plan-key')}>{copied === 'plan-key' ? <Check /> : <Copy />}</Button></div> : <p>Sua chave é criada assim que o PIX do seu plano for aprovado. Aí é só copiar e colar na sua ferramenta.</p>}</div></div>
              </div>
            </article>
            <div className="client-plan-models"><div className="client-plan-models-head"><Layers size={16} /><h3>Modelos do seu plano</h3>{keys.length > 1 ? <Select value={apiKey?.id ?? ''} onValueChange={setApiKeyId}><SelectTrigger aria-label="Chave do plano" className="ml-auto w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{keys.map(k => <SelectItem key={k.id} value={k.id}>{k.plano || 'Chave NEXA'} · {k.api_key.slice(-4)}</SelectItem>)}</SelectContent></Select> : null}</div>{models.isPending ? <div className="client-empty">Carregando modelos…</div> : models.error ? <div className="client-empty">Não foi possível carregar os modelos agora.</div> : models.data.data.length ? <div className="client-plan-models-grid">{models.data.data.map(m => <button type="button" key={m.id} title={`Copiar comando /model ${m.id}`} onClick={() => void copy(`/model ${m.id}`, `model-${m.id}`)}><span className="client-plan-model-icon"><ModelBrandIcon id={m.id} /></span><span><strong>{apiModelLabel(m.id)}</strong><small>{copied === `model-${m.id}` ? 'Comando copiado!' : `/model ${m.id}`}</small></span></button>)}</div> : <div className="client-empty">Nenhum modelo disponível no momento.</div>}</div><p className="client-info-band"><Info size={15} />Novos planos liberam uma chave nova. Na recarga de tokens, o saldo é adicionado à mesma chave após a aprovação do PIX.</p>{data?.plans.length ? <p className="client-plan-note">{data.plans.map(p => `${p.name} · ${money(p.price_cents)}`).join(' / ')}</p> : null}</section>;
        })()}


        {tab === 'api' && <section className="client-section"><div className="client-section-heading"><div><h2>Acesso à API</h2><p>Claude Code / OpenCode / OpenAI compatible</p></div><Braces size={20} /></div><ClientApiAccess base={BASE} activeCount={activeKeys.length} commandModel={commandModel} copied={copied} onCopy={(value, id) => void copy(value, id)} /></section>}

        {tab === 'chaves' && <section className="client-section"><div className="client-section-heading"><div><h2>Chaves de API</h2><p>Suas credenciais de conexão</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => document.getElementById('baixar-app-windows')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><MonitorDown />Baixar app Nexa Cloud</Button><KeyRound size={20} /></div></div>{activeKeys.length ? <div className="client-key-list">{activeKeys.map(k => <article key={k.id}><div className="client-key-head"><span className="client-key-icon"><KeyRound size={20} /></span><div className="client-key-id"><strong>{k.plano || 'Chave NEXA'}</strong><code>{revealed.includes(k.id) ? k.api_key : `${k.api_key.slice(0, 9)}${'•'.repeat(22)}${k.api_key.slice(-4)}`}</code></div><span className="client-badge">{k.status === 'active' ? 'Ativa' : k.status === 'revoked' ? 'Revogada' : 'Bloqueada'}</span></div><div className="client-key-facts"><div><span>Tokens usados</span><strong>{plural(k.tokens_used, 'token', 'tokens')}</strong><small>{plural(k.requests_count, 'comando', 'comandos')}</small></div><div><span>Último uso</span><strong>{k.last_used_at ? dayMonth(k.last_used_at) : 'Nunca usada'}</strong></div><div><span>Criada em</span><strong>{dayMonth(k.created_at)}</strong></div></div><div className="client-key-actions"><Button variant="outline" size="sm" onClick={() => setRevealed(prev => prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id])}>{revealed.includes(k.id) ? <EyeOff /> : <Eye />}{revealed.includes(k.id) ? 'Ocultar' : 'Mostrar'}</Button><Button variant="outline" size="sm" onClick={() => void copy(k.api_key, k.id)}>{copied === k.id ? <Check /> : <Copy />}{copied === k.id ? 'Copiada' : 'Copiar chave'}</Button></div></article>)}</div> : <div className="client-empty">Nenhuma chave ativa. Após a aprovação do pagamento, ela aparecerá aqui automaticamente.</div>}</section>}
        {tab === 'chaves' && <WindowsAppCard apiKey={activeKeys[0]?.api_key} />}

        {tab === 'conta' && <div className="client-workspace-settings"><section className="client-section client-panel"><div className="client-workspace-identity"><span className="client-avatar">{initials(String(name))}</span><div><h2>{String(name)}</h2><p>{data?.email}</p></div><span className="client-badge">{activeKeys.length} chaves ativas</span></div></section><section className="client-section client-panel"><div className="client-section-heading"><h2>Perfil</h2></div><dl className="client-account"><div><dt>NOME</dt><dd>{String(name)}</dd></div><div><dt>E-MAIL</dt><dd>{data?.email}</dd></div><div><dt>MEMBRO DESDE</dt><dd>{new Date(data?.createdAt ?? user.created_at).toLocaleDateString('pt-BR')}</dd></div></dl></section><section className="client-section client-panel"><div className="client-section-heading"><div><h2>Preferências</h2><p>Idioma da sua conta</p></div><LanguageToggle /></div></section></div>}

        {tab === 'suporte' && <div className="client-workspace-support"><article><MessageSquare /><h2>Assistente Alexa</h2><p>Tire suas dúvidas sobre planos, conexão e uso da sua chave.</p><Button className="client-primary" asChild><Link to="/assistente">Abrir o chat <ArrowRight /></Link></Button></article><article><LifeBuoy /><h2>Atendimento pelo WhatsApp</h2><p>Converse com nossa equipe para um atendimento personalizado.</p><Button variant="outline" asChild><a href={SUPPORT} target="_blank" rel="noreferrer">Abrir WhatsApp <ArrowUpRight /></a></Button></article><article><BookOpen /><h2>Documentação</h2><p>Claude Code, OpenCode e configuração da API NEXA.</p><Button variant="outline" asChild><Link to="/docs">Ver documentação <ArrowRight /></Link></Button></article></div>}
        {tab === 'faturas' && (() => {
          const payments = data?.payments ?? [];
          const approved = payments.filter(p => p.status === 'approved');
          const pending = payments.filter(p => p.status === 'pending' || p.status === 'in_process');
          const paidTotal = approved.reduce((sum, p) => sum + p.amount_cents, 0);
          const statusTone = (status: string) => status === 'approved' ? 'ok' : status === 'pending' || status === 'in_process' ? 'wait' : 'bad';
          const statusIcon = (status: string) => status === 'approved' ? <Check size={13} /> : status === 'pending' || status === 'in_process' ? <Clock3 size={13} /> : <XCircle size={13} />;
          return <>
            <div className="client-section-heading"><div><h2>Faturas</h2><p>Histórico dos seus pagamentos por PIX</p></div><span className="client-badge">PIX</span></div>
            <div className="client-invoice-summary">
              <article><span className="client-invoice-summary-icon"><Wallet size={18} /></span><div><small>Total pago</small><strong>{money(paidTotal)}</strong></div></article>
              <article><span className="client-invoice-summary-icon"><Check size={18} /></span><div><small>Pagamentos aprovados</small><strong>{approved.length}</strong></div></article>
              <article><span className="client-invoice-summary-icon"><Clock3 size={18} /></span><div><small>Aguardando PIX</small><strong>{pending.length}</strong></div></article>
            </div>
            <section className="client-section client-panel client-invoices-panel">
              {payments.length ? <ul className="client-invoice-list">{payments.map(p => <li key={p.id}>
                <span className="client-invoice-icon"><Receipt size={18} /></span>
                <div className="client-invoice-main"><strong>{p.plan_name}</strong><small>{new Date(p.approved_at ?? p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · PIX</small></div>
                <div className="client-invoice-side"><strong>{money(p.amount_cents)}</strong><span className={`client-invoice-status is-${statusTone(p.status)}`}>{statusIcon(p.status)}{t(FATURA_STATUS[p.status] ?? p.status)}</span></div>
              </li>)}</ul> : <div className="client-empty">{t('Nenhum pagamento ainda.')}</div>}
            </section>
          </>;
        })()}
      </>}
      {resetKey && <DailyResetDialog keyId={resetKey.id} planName={resetKey.plan} onClose={() => setResetKey(null)} />}
      {upgradeKeyId && <TokenUpgradeDialog keyId={upgradeKeyId} family={keys.find(k => k.id === upgradeKeyId)?.model_family ?? 'claude'} onClose={() => setUpgradeKeyId(null)} />}
      <footer className="client-footer"><span className="client-footer-copy">© 2026 NEXA CLOUD. Todos os direitos reservados.</span><nav className="client-footer-nav"><Link to="/termos">Termos de uso</Link><Link to="/reembolso">Reembolso</Link></nav><small className="client-footer-credit">Desenvolvido pela Nexa Pro</small></footer>
    </main></div></div>;
}
