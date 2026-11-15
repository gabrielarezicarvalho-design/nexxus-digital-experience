-- Read-only regression check for Gabriel's requested total quota.
SELECT EXISTS (
  SELECT 1 FROM public.api_keys
  WHERE id = '911c52e4-cdd6-410e-84dd-9864ffc5af59'
    AND client_id = 'd63f2c26-1310-408f-87fd-449ff84cb3d8'
    AND token_limit = 1000000000
    AND status = 'active'
    AND forced_provider = 'Anthropic Revenda'
    AND daily_token_limit IS NULL
    AND rpm_limit = 60
    AND expires_at IS NULL
) AS requested_quota_verified;