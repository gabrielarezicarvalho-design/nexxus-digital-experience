-- Chaves de API de fornecedores cadastradas pelo painel. Só o servidor (service_role) lê ou grava:
-- RLS ligada e nenhuma política, e sem permissão para anon/authenticated.
CREATE TABLE IF NOT EXISTS public.provider_secrets (
  secret_name text PRIMARY KEY CHECK (secret_name ~ '^[A-Z][A-Z0-9_]{2,99}$'),
  api_key text NOT NULL CHECK (length(api_key) BETWEEN 8 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_secrets FROM anon, authenticated;
GRANT ALL ON public.provider_secrets TO service_role;
