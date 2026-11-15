-- Rodar no banco da VPS logo depois de cada restauração do backup da Lovable.
-- Decisão do dono (15/11/2026): usar somente a DevHub como fornecedor.
begin;
update public.provider_accounts set active = (name = 'DevHub Brasil');
-- Keys fixadas em fornecedores que foram desligados voltam para a rota normal (DevHub).
update public.api_keys set forced_provider = null where coalesce(forced_provider, '') <> '';
commit;
select name, active, base_url from public.provider_accounts order by priority;
