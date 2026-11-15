-- Run these read-only checks after registering Anthropic Revenda.
select
  exists(select 1 from public.provider_accounts where name = 'Anthropic Revenda' and base_url = 'https://painelnexa.anthropicrevenda.site/v1' and api_secret_name = 'ANTHROPICREVENDA_API_KEY' and active and not paused) as provider_registered,
  exists(select 1 from public.models where name = 'claude' and internal_id = 'claude' and provider = 'Anthropic Revenda' and enabled) as generic_claude_owned,
  (select count(*) = 4 from public.models where name in ('claude-opus-4.8','claude-opus-5.5','claude-fable-5.1','claude-sonnet-5') and provider = 'RadoxAI') as versioned_models_unchanged,
  (select array_agg(name order by priority) = array['RadoxAI','Anthropic Revenda','CodeCraft API','Clean APIs'] from public.provider_accounts where active and not paused) as priority_preserved;
