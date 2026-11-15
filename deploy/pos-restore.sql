-- Rodar no banco da VPS logo depois de cada restauração do backup da Lovable.
-- Decisão do dono (15/11/2026): DevHub para Claude; 9Router (Anthropic Revenda) só para GPT/Gemini.
-- O código (devhubServesInCommonLine) garante que Claude nunca vai para a 9Router.
begin;
update public.provider_accounts set active = (name in ('DevHub Brasil', 'Anthropic Revenda')), paused = false
  where name in ('DevHub Brasil', 'Anthropic Revenda') or active;
update public.provider_accounts set priority = 1 where name = 'DevHub Brasil';
update public.provider_accounts set priority = 2 where name = 'Anthropic Revenda';
-- Keys fixadas em fornecedores desligados voltam para a rota normal.
update public.api_keys set forced_provider = null where coalesce(forced_provider, '') <> '';
commit;
select name, active, priority, base_url from public.provider_accounts order by priority;
