-- Run with the database read tool after provider removal.
SELECT
  NOT EXISTS (SELECT 1 FROM public.provider_accounts WHERE name = 'SubtoAPI') AS subtoapi_removed,
  NOT EXISTS (SELECT 1 FROM public.provider_accounts WHERE name = 'AIPrimeTech') AS aiprimetech_removed,
  NOT EXISTS (SELECT 1 FROM public.models WHERE provider IN ('SubtoAPI', 'AIPrimeTech')) AS exclusive_models_removed,
  (SELECT count(*) = 3 FROM public.provider_accounts WHERE name IN ('RadoxAI', 'CodeCraft API', 'Clean APIs') AND active AND NOT paused) AS remaining_providers_preserved;