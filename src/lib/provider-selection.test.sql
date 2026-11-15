-- Current requested configuration; concrete data assertions, no credentials.
SELECT
  EXISTS(SELECT 1 FROM public.provider_accounts WHERE name = 'Anthropic Revenda' AND active AND NOT paused AND priority = 0) AS anthropic_selected,
  (SELECT array_agg(name ORDER BY name) FROM public.models WHERE enabled) = ARRAY['claude']::text[] AS own_model_only,
  EXISTS(SELECT 1 FROM public.models WHERE name = 'claude' AND internal_id = 'claude' AND provider = 'Anthropic Revenda' AND catalog_approved) AS identity_preserved,
  NOT has_function_privilege('anon', 'public.admin_select_primary_provider(uuid,text[])', 'EXECUTE') AS anonymous_selection_denied;