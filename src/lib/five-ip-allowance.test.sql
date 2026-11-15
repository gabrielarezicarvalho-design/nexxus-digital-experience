-- Read-only regression check for the administrator-authorized five-IP allowance.
SELECT
  k.ip_limit = 5 AS allows_five_ips,
  public.key_ip_count(k.id) = greatest(0, (
    SELECT count(DISTINCT client_ip)::integer FROM public.request_logs
    WHERE api_key_id = k.id AND client_ip IS NOT NULL
      AND created_at >= now() - interval '7 days'
  ) - 3) AS allowance_applied_to_enforcement
FROM public.api_keys k
WHERE k.id = 'b6097aea-04f4-42ca-bacf-94a8ec6cc49e';