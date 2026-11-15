-- Every assertion must be true. No credentials or request history are modified.
SELECT
  count(*) > 0 AS existing_support_keys_found,
  bool_and(public.key_ip_count(k.id) = 0) AS support_keys_have_no_ip_block
FROM public.api_keys k
WHERE k.created_by = '41bcf65b-8101-484e-a496-d0e5640cc0ee';

SELECT
  count(*) = 1 AS support_reseller_found,
  bool_and(k.created_by = r.user_id) AS reseller_keys_record_support_issuer
FROM public.api_keys k JOIN public.resellers r ON r.id = k.reseller_id
WHERE lower(r.email) = 'suporte@nextprodev.com.br';

SELECT count(*) > 0 AS other_keys_exist,
  bool_and(public.key_ip_count(k.id) = greatest(0, (
    SELECT count(DISTINCT l.client_ip)::integer FROM public.request_logs l
    WHERE l.api_key_id = k.id AND l.client_ip IS NOT NULL
      AND l.created_at >= now() - interval '7 days'
  ) - (k.ip_limit - 2))) AS other_keys_keep_their_ip_allowance
FROM public.api_keys k
WHERE k.created_by IS DISTINCT FROM '41bcf65b-8101-484e-a496-d0e5640cc0ee'::uuid;