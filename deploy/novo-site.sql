-- Transforma a cópia do banco do site antigo (cloudnexapro.site) no banco do SITE NOVO (cloudnexa.com.br).
-- Decisão do dono (15/11/2026): o site antigo continua na Lovable com os clientes atuais;
-- o site novo começa sem clientes. Vem do antigo só a configuração e o total de tokens já usados.
begin;

-- 1) Ponto de partida do contador público de tokens (totais do site antigo em 15/11/2026 19:47 BRT).
create table if not exists public.site_stats_baseline (
  id int primary key default 1 check (id = 1),
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  calls bigint not null default 0,
  captured_at timestamptz not null default now()
);
alter table public.site_stats_baseline enable row level security;
insert into public.site_stats_baseline (id, prompt_tokens, completion_tokens, calls, captured_at)
values (1, 75854458052, 716822016, 787526, '2026-11-15 19:47:33-03')
on conflict (id) do update set prompt_tokens = excluded.prompt_tokens, completion_tokens = excluded.completion_tokens,
  calls = excluded.calls, captured_at = excluded.captured_at;

-- 2) Contador público = ponto de partida + uso do site novo.
create or replace function public.public_site_stats()
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  WITH today AS (
    SELECT count(*) AS calls,
      count(*) FILTER (WHERE status_code >= 200 AND status_code < 300) AS ok,
      count(*) FILTER (WHERE status_code = 502) AS excluded_502,
      count(*) FILTER (WHERE status_code >= 300 AND NOT public.is_operational_failure(status_code, provider, error)) AS rate_excluded_502
    FROM public.request_logs
    WHERE created_at >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo'
  ), totals AS (
    SELECT coalesce(sum(prompt_tokens), 0) + coalesce((SELECT prompt_tokens FROM public.site_stats_baseline WHERE id = 1), 0) AS prompt,
      coalesce(sum(completion_tokens), 0) + coalesce((SELECT completion_tokens FROM public.site_stats_baseline WHERE id = 1), 0) AS completion
    FROM public.request_logs
  ), unique_names AS (
    SELECT DISTINCT ON (lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')))
      name, display_name, created_at
    FROM public.models
    WHERE enabled = true AND catalog_approved = true
    ORDER BY lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')), created_at, name
  ), m AS (
    SELECT count(DISTINCT lower(regexp_replace(COALESCE(NULLIF(btrim(display_name), ''), name), '[^a-zA-Z0-9]', '', 'g'))) AS enabled
    FROM unique_names
  )
  SELECT jsonb_build_object(
    'promptTokens', totals.prompt,
    'completionTokens', totals.completion,
    'callsToday', today.calls,
    'successToday', today.ok,
    'excluded502Today', today.excluded_502,
    'rateExcluded502Today', today.rate_excluded_502,
    'modelsEnabled', m.enabled
  )
  FROM totals, today, m
$function$;

-- 3) Apaga tudo que é de cliente, revendedor ou afiliado do site antigo.
truncate public.request_logs, public.token_upgrades, public.payments, public.api_keys, public.clients,
  public.reseller_payouts, public.reseller_plans, public.reseller_api_access_logs, public.resellers,
  public.affiliate_payouts, public.affiliates, public.assistant_messages, public.assistant_threads,
  public.audit_logs, public.admin_access_events, public.key_spam_fingerprints,
  public.push_deliveries, public.push_devices, public.rpm_exempt_clients, public.site_page_views,
  public.provider_model_cooldowns, public.provider_key_usage;

-- 4) Usuários: ficam só as contas de administrador.
delete from public.user_roles where role <> 'admin';
delete from public.profiles where id not in (select user_id from public.user_roles where role = 'admin');
delete from auth.users where id not in (select user_id from public.user_roles where role = 'admin');

commit;

select (select count(*) from auth.users) usuarios, (select count(*) from public.clients) clientes,
  (select count(*) from public.api_keys) keys, (select count(*) from public.plans) planos,
  (select count(*) from public.models) modelos, public.public_site_stats()->>'promptTokens' tokens_entrada;
