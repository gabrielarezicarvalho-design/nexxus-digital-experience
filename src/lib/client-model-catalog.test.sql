-- Live regression checks: approved catalog must reach key-authenticated gateway
-- requests (service_role has no auth.uid), but not anonymous callers.
WITH claims AS MATERIALIZED (
  SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true) AS configured
), result AS MATERIALIZED (
  SELECT CASE WHEN configured IS NOT NULL THEN public.client_public_model_names() END AS names FROM claims
)
SELECT 1 / CASE WHEN names @> ARRAY['claude-opus-5-5', 'claude-sonnet-5', 'claude-fable-5.1'] THEN 1 ELSE 0 END AS gateway_catalog_pass FROM result;

WITH claims AS MATERIALIZED (
  SELECT set_config('request.jwt.claims', '{"role":"anon"}', true) AS configured
), result AS MATERIALIZED (
  SELECT CASE WHEN configured IS NOT NULL THEN public.client_public_model_names() END AS names FROM claims
)
SELECT 1 / CASE WHEN cardinality(names) = 0 THEN 1 ELSE 0 END AS anonymous_catalog_pass FROM result;