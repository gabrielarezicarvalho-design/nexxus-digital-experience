-- Read-only verification of the final administrator-approved release.
SELECT
  k.status = 'active' AS released_now,
  k.ip_limit = 20 AS current_ip_allowance,
  public.key_ip_count(k.id) <= 2 AS passes_current_ip_check,
  EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.entity_id = k.id AND a.action = 'key.unblocked'
      AND a.details->>'final_unblock' = 'true'
      AND a.details->>'no_future_unblock' = 'true'
      AND a.details->>'ip_limit' = '3'
  ) AS final_release_audited
FROM public.api_keys k
WHERE k.id = '1596a2d6-0c5d-4c11-8b85-b15f8535f127';