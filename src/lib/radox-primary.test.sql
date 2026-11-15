-- Persisted owner-selected priority and catalog; each assertion fails on mismatch.
SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM public.provider_accounts
  WHERE name = 'RadoxAI' AND priority = 0 AND active AND NOT paused
) THEN 1 ELSE 0 END AS radox_primary;

SELECT 1 / CASE WHEN (
  SELECT count(*) FROM public.models WHERE enabled
  AND name IN ('claude-opus-4.8', 'claude-opus-5.5', 'claude-fable-5.1', 'claude-sonnet-5')
) = 4 THEN 1 ELSE 0 END AS original_models_enabled;

SELECT 1 / CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.models WHERE provider = 'SubtoAPI' AND enabled
) THEN 1 ELSE 0 END AS subtoapi_tiers_hidden;