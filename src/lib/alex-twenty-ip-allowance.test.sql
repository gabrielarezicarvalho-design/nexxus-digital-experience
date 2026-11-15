-- Read-only regression check for Alex's 20-IP allowance without another release.
SELECT
  k.ip_limit = 20 AS allows_twenty_ips,
  k.status = 'active' AS status_preserved,
  public.key_ip_count(k.id) = greatest(0, (
    SELECT count(DISTINCT client_ip)::integer FROM public.request_logs
    WHERE api_key_id = k.id AND client_ip IS NOT NULL
      AND created_at >= now() - interval '7 days'
  ) - 18) AS allowance_applied_to_enforcement,
  EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.entity_id = k.id
    AND a.action = 'key.ip_limit.updated' AND a.details->>'ip_limit' = '20'
    AND a.details->>'previous_ip_limit' = '15') AS change_audited
FROM public.api_keys k WHERE k.id = '1596a2d6-0c5d-4c11-8b85-b15f8535f127';
