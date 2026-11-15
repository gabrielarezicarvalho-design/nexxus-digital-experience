-- Read-only regression check for the administrator-authorized exception.
-- Each boolean must be true when run through the database read tool.
SELECT
  k.status = 'active' AS key_is_active,
  k.ip_limit = 3 AS allows_three_legitimate_ips,
  public.key_ip_count(k.id) = greatest(0, (
    SELECT count(DISTINCT client_ip)::integer FROM public.request_logs
    WHERE api_key_id=k.id AND client_ip IS NOT NULL
      AND created_at >= now() - interval '7 days'
  ) - 1) AS exception_is_applied_to_enforcement,
  EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.entity_id=k.id
    AND a.action='key.unblocked' AND a.details->>'ip_limit'='3') AS unblock_is_audited
FROM public.api_keys k WHERE k.id='142dca22-0379-4643-914f-c1a071819557';