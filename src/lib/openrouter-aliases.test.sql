-- Each public alias must use the OpenRouter free router without renaming Claude.
SELECT name,
  provider = 'OpenRouter' AND internal_id = 'openrouter/free' AND enabled AND catalog_approved AS passed
FROM public.models
WHERE name IN ('cloud-fable-5.1', 'cloud-opus-5.1', 'cloud-sonnet-5.1');
SELECT count(*) = 3 AS all_three_present
FROM public.models
WHERE name IN ('cloud-fable-5.1', 'cloud-opus-5.1', 'cloud-sonnet-5.1');
SELECT NOT EXISTS (SELECT 1 FROM public.models WHERE name = 'openrouter/free' AND enabled) AS internal_id_hidden;
SELECT EXISTS (SELECT 1 FROM public.models WHERE name = 'claude-fable-5.1' AND provider <> 'OpenRouter') AS existing_claude_preserved;