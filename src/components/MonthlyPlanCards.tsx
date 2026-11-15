import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gptMonthlyPlanPreviews, monthlyPlanPreviews, monthlyPreviewCanCheckout } from '@/lib/monthly-plan-preview';
import logoAsset from '@/assets/nexus/nexa-logo.png.asset.json';
import { useLang } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import './monthly-plan-cards.css';

type MonthlyPreview = (typeof monthlyPlanPreviews)[number] | (typeof gptMonthlyPlanPreviews)[number];

export function MonthlyPlanCards({ onBuy, previews = monthlyPlanPreviews }: { onBuy?: (plan: { code: string; name: string; priceCents: number; badge?: string }) => void; previews?: readonly MonthlyPreview[] }) {
  const { t } = useLang();
  const { data: live } = useQuery({
    queryKey: ['public-plans', 'monthly', previews[0]?.code], staleTime: 30_000, refetchInterval: 60_000,
    queryFn: async () => (await supabase.from('plans').select('code,name,price_cents,active,badge,best').in('code', previews.map(p => p.code))).data ?? null,
  });
  const plans = previews.flatMap(base => {
    const row = live?.find(r => r.code === base.code);
    if (live && (!row || !row.active)) return [];
    return [{ ...base, name: row?.name ?? base.name, priceCents: row?.price_cents ?? base.priceCents, featured: row ? !!row.best : base.featured, badge: row ? (row.badge ?? '') : (base.featured ? 'DESTAQUE' : base.id.endsWith('enterprise') ? 'NOVO' : '') }];
  });
  return <>
    <div className="monthly-plan-grid">
      {plans.map(plan => <article key={plan.id} className={`monthly-plan-card${plan.featured ? ' monthly-plan-card--featured' : ''}`}>
        <header className="monthly-plan-heading"><h3>{plan.name}</h3>{plan.badge ? <span className={`monthly-plan-badge`}>{t(plan.badge)}</span> : null}</header>
        <p className="monthly-plan-description">{t(plan.description)}</p>
        <div className="monthly-plan-price">{!live ? <strong aria-label={t('Carregando preço')}>R$ …</strong> : <>{'originalCents' in plan && plan.originalCents > plan.priceCents && <s className="text-muted-foreground mr-2 text-base font-medium">{(plan.originalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</s>}<strong>{(plan.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><span>/{t('mês')}</span></>}</div>
        <Button variant={plan.featured ? 'default' : 'outline'} className="monthly-plan-subscribe" disabled={!live || !monthlyPreviewCanCheckout() || !onBuy} onClick={() => onBuy?.({ code: plan.code, name: plan.name, priceCents: plan.priceCents, badge: plan.badge })}>{t('Assinar')} {plan.name}<ArrowRight size={15} /></Button>
        <span className="monthly-plan-availability">{t('Pagamento via PIX · 30 dias')}</span>
        <ul className="monthly-plan-features">
          {plan.models.map(model => <li key={model}><Check size={14} /><span>{model}</span></li>)}
          {('extras' in plan ? plan.extras : []).map(extra => <li key={extra}><Check size={14} /><span>{t(extra)}</span></li>)}
          <li><Check size={14} /><span>{t('Acesso pelo computador e navegador')}</span></li>
          <li><Check size={14} /><span>{t('Claude Code e OpenCode')}</span></li>
          <li><Check size={14} /><span>{t('Consumo no seu painel')}</span></li>
          {('tail' in plan ? plan.tail : []).map(extra => <li key={extra}><Check size={14} /><span>{t(extra)}</span></li>)}
        </ul>
        <footer className="monthly-plan-footer"><img src={logoAsset.url} alt="" /><span>NEXA CLOUD</span></footer>
      </article>)}
    </div>
  </>;
}