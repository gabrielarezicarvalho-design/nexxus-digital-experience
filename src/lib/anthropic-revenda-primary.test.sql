-- Persisted owner-selected priority: RadoxAI primary, Anthropic Revenda second.
select
  exists(select 1 from public.provider_accounts where name = 'RadoxAI' and active and not paused and priority = 0) as radox_primary,
  exists(select 1 from public.provider_accounts where name = 'Anthropic Revenda' and active and not paused and priority = 1 and default_model = 'claude') as revenda_second,
  (select array_agg(name order by priority) = array['RadoxAI','Anthropic Revenda','CodeCraft API','Clean APIs'] from public.provider_accounts where active and not paused) as requested_order,
  exists(select 1 from public.models where name = 'claude' and internal_id = 'claude' and provider = 'Anthropic Revenda' and enabled) as generic_model_available;
